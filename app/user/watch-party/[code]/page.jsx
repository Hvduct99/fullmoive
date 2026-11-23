'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Check, Crown, Send, Loader2, Play, Users, X, Wifi, WifiOff, Hand } from 'lucide-react';
import { useUser } from '@/components/user/UserContext';
import HlsVideo from '@/components/watch-party/HlsVideo';
import useWatchPartySync from '@/components/watch-party/useWatchPartySync';
import { getFaction } from '@/lib/membership';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || '';
const ACTION_LABEL = { play: 'phát', pause: 'tạm dừng', seek: 'tua', episode: 'chuyển tập' };

export default function WatchPartyRoom({ params }) {
  const code = String(params.code || '').toUpperCase();
  const router = useRouter();
  const { user } = useUser();
  const [state, setState] = useState(null); // { party, isHost, isMember, members }
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [movie, setMovie] = useState(null);
  const [episodeSlug, setEpisodeSlug] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [videoEl, setVideoEl] = useState(null);
  const lastIdRef = useRef(0);
  const joinedRef = useRef(false);
  const chatRef = useRef(null);

  const pushToast = useCallback((msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-3), { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const addMessages = useCallback((list) => {
    if (!list?.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const merged = [...prev, ...list.filter((m) => !seen.has(m.id))].sort((a, b) => a.id - b.id).slice(-200);
      lastIdRef.current = Math.max(lastIdRef.current, merged.length ? merged[merged.length - 1].id : 0);
      return merged;
    });
  }, []);

  const isHost = !!state?.isHost;
  const sync = useWatchPartySync({
    code,
    video: videoEl,
    socketUrl: SOCKET_URL,
    isHost,
    selfId: user.id,
    enabled: !!state?.isMember && state?.party?.status === 'open',
    onEpisodeChange: (ep) => setEpisodeSlug(ep),
    onChat: (m) => addMessages([m]),
    onNotice: (n) => {
      if (n.type === 'join') pushToast(`${n.username} vừa vào phòng`);
      else if (n.type === 'leave') pushToast(`${n.username} đã rời phòng`);
      else if (n.type === 'denied') pushToast('Chỉ chủ phòng đang điều khiển video');
    },
  });

  // ---------- Tải trạng thái phòng (DB) ----------
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/watch-party/${code}?after=${lastIdRef.current}`, { cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.message || 'Không tải được phòng'); return; }
      setState({ party: d.party, isHost: d.isHost, isMember: d.isMember, members: d.members });
      addMessages(d.messages);
      if (!d.isMember && d.party.status === 'open' && !joinedRef.current) {
        joinedRef.current = true;
        const j = await fetch(`/api/watch-party/${code}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join' }) });
        if (!j.ok) { const jd = await j.json().catch(() => ({})); setError(jd.message || 'Không vào được phòng'); }
        else load();
      }
    } catch { /* mạng chập chờn */ }
  }, [code, addMessages]);

  // Poll DB: nhanh khi chưa có realtime, chậm (chỉ để cập nhật danh sách) khi đã kết nối socket
  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, sync.connected ? 15000 : 3000);
    return () => clearInterval(t);
  }, [load, sync.connected]);

  const movieSlug = state?.party?.movie_slug;
  useEffect(() => {
    if (!movieSlug) return;
    fetch(`/api/movie/${movieSlug}`).then((r) => (r.ok ? r.json() : null)).then((d) => d?.movie && setMovie(d.movie)).catch(() => {});
  }, [movieSlug]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const episodes = useMemo(() => movie?.episodes?.[0]?.server_data || [], [movie]);
  const party = state?.party;
  const wantedEp = episodeSlug || party?.episode_slug;
  const currentEp = episodes.find((e) => e.slug === wantedEp) || episodes[0];

  const act = async (action, extra = {}) => {
    const res = await fetch(`/api/watch-party/${code}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.message || 'Lỗi');
    return d;
  };

  const pickEpisode = (slug) => {
    if (sync.connected) {
      if (!sync.canControl) return pushToast('Chỉ chủ phòng đang điều khiển video');
      sync.changeEpisode(slug);
    } else {
      setEpisodeSlug(slug); // chưa có realtime: chỉ đổi trên máy mình
    }
    if (isHost) act('episode', { episode_slug: slug }).catch(() => {});
  };

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const d = await act('message', { content });
      setText('');
      const msg = { id: d.id, content: d.content, user_id: user.id, username: user.username, faction: user.faction, created_at: new Date().toISOString() };
      addMessages([msg]);
      sync.broadcastChat({ id: d.id, content: d.content }); // phát realtime cho cả phòng
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/user/watch-party/${code}`);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    } catch { /* bỏ qua */ }
  };

  if (error && !state) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-red-400">{error}</p>
        <Link href="/user/watch-party" className="text-[var(--fx)] hover:underline text-sm">← Về danh sách phòng</Link>
      </div>
    );
  }
  if (!state) return <div className="h-[60vh] rounded-2xl bg-white/5 animate-pulse" />;

  const closed = party.status === 'closed';
  const onlineIds = new Set(sync.connected ? sync.presence.map((p) => p.userId) : state.members.filter((m) => m.online).map((m) => m.id));
  const allowAll = !!sync.roomState?.allowAll;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/user/watch-party" className="p-2 rounded-lg bg-white/5 text-gray-300 hover:text-white" aria-label="Quay lại"><ArrowLeft size={18} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-xl font-black text-white truncate">{party.title}</h1>
          <p className="text-xs text-gray-400 truncate">{party.movie_name} · Chủ phòng: {party.host_name}</p>
        </div>
        <SyncBadge sync={sync} />
        <button onClick={copyLink} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[rgb(var(--fx-rgb)/0.5)] text-[var(--fx)] text-sm font-bold hover:bg-[rgb(var(--fx-rgb)/0.1)]">
          {copied ? <Check size={16} /> : <Copy size={16} />} <span className="font-mono">#{code}</span>
        </button>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 flex justify-between">{error}<button onClick={() => setError('')}><X size={14} /></button></p>}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Player */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
            {closed ? (
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold">Phòng đã đóng.</div>
            ) : !movie ? (
              <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-[var(--fx)]" /></div>
            ) : currentEp?.link_m3u8 ? (
              <>
                <HlsVideo ref={setVideoEl} src={currentEp.link_m3u8} poster={movie.thumb_url || party.movie_thumb} />
                {sync.needsGesture && (
                  <button onClick={sync.resumeWithGesture}
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
                    <span className="w-16 h-16 rounded-full bg-[var(--fx)] text-black flex items-center justify-center shadow-[0_0_30px_rgb(var(--fx-rgb)/0.9)]"><Play size={28} fill="currentColor" /></span>
                    <span className="font-bold">Cả phòng đang xem — bấm để vào xem cùng</span>
                  </button>
                )}
              </>
            ) : currentEp?.link_embed ? (
              <>
                <iframe src={currentEp.link_embed} className="absolute inset-0 w-full h-full" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture" />
                <p className="absolute bottom-2 left-2 right-2 text-[11px] bg-black/70 text-amber-300 rounded px-2 py-1">Tập này không có nguồn HLS nên không đồng bộ được — mọi người tự bấm phát.</p>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">Không tìm thấy nguồn phát.</div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
            {sync.lastAction && Date.now() - sync.lastAction.at < 8000 && (
              <span className="px-2 py-1 rounded-full bg-white/5 text-gray-300">{sync.lastAction.username} vừa {ACTION_LABEL[sync.lastAction.action] || sync.lastAction.action}</span>
            )}
            {sync.connected && !sync.canControl && <span className="px-2 py-1 rounded-full bg-white/5 flex items-center gap-1"><Hand size={11} /> Chủ phòng đang điều khiển</span>}
            {isHost && sync.connected && (
              <label className="ml-auto flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={allowAll} onChange={(e) => sync.setAllowAll(e.target.checked)} className="accent-[var(--fx)]" />
                Cho mọi người cùng điều khiển
              </label>
            )}
          </div>

          {episodes.length > 1 && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#121217] p-3">
              <p className="text-xs text-gray-400 mb-2">Chọn tập:</p>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5 max-h-40 overflow-y-auto">
                {episodes.map((ep) => {
                  const active = ep.slug === currentEp?.slug;
                  return (
                    <button key={ep.slug} disabled={closed} onClick={() => pickEpisode(ep.slug)}
                      className={`py-1.5 rounded text-xs font-semibold ${active ? 'bg-[var(--fx)] text-black' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
                      {ep.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {isHost && !closed && (
              <button onClick={async () => { if (confirm('Đóng phòng này?')) { try { await act('close'); load(); } catch (e) { setError(e.message); } } }}
                className="text-xs px-3 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10">Đóng phòng</button>
            )}
            {!isHost && state.isMember && (
              <button onClick={async () => { try { await act('leave'); router.push('/user/watch-party'); } catch (e) { setError(e.message); } }}
                className="text-xs px-3 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white">Rời phòng</button>
            )}
          </div>
        </div>

        {/* Thành viên + chat */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#121217] flex flex-col h-[520px]">
          <div className="p-3 border-b border-white/5">
            <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-2"><Users size={14} /> {state.members.length} thành viên · <span className="text-emerald-400">{onlineIds.size} đang xem</span></p>
            <div className="flex -space-x-2 overflow-hidden">
              {state.members.slice(0, 12).map((m) => (
                <div key={m.id} title={m.username} className="relative w-8 h-8 rounded-full border-2 border-[#121217] bg-gray-800 flex items-center justify-center text-[11px] font-bold" style={{ color: getFaction(m.faction).accent }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : (m.username || '?')[0].toUpperCase()}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#121217] ${onlineIds.has(m.id) ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                  {m.id === party.host_id && <Crown size={10} className="absolute -top-1 -right-0.5 text-yellow-400" />}
                </div>
              ))}
            </div>
          </div>
          <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && <p className="text-xs text-gray-600 text-center mt-8">Chưa có tin nhắn. Chào cả hội một câu đi!</p>}
            {messages.map((m) => {
              const mine = m.user_id === user.id;
              return (
                <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  {!mine && <span className="text-[10px] font-bold mb-0.5" style={{ color: getFaction(m.faction).accent }}>{m.username}</span>}
                  <span className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-sm break-words ${mine ? 'bg-[var(--fx)] text-black rounded-br-sm' : 'bg-white/10 text-white rounded-bl-sm'}`}>{m.content}</span>
                </div>
              );
            })}
          </div>
          <form onSubmit={send} className="p-2 border-t border-white/5 flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} disabled={closed || !state.isMember} placeholder={closed ? 'Phòng đã đóng' : 'Nhắn gì đó…'}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--fx)] disabled:opacity-50" />
            <button disabled={sending || !text.trim() || closed} className="px-3 rounded-xl bg-[var(--fx)] text-black disabled:opacity-40" aria-label="Gửi">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      </div>

      {/* Thông báo nhỏ */}
      <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[150] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="px-4 py-2 rounded-full bg-black/85 border border-white/10 text-sm text-white shadow-lg animate-fade-in-up">{t.msg}</div>
        ))}
      </div>
    </div>
  );
}

function SyncBadge({ sync }) {
  if (sync.status === 'disabled') {
    return <span className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 text-gray-400 flex items-center gap-1.5" title="Chưa cấu hình NEXT_PUBLIC_SOCKET_URL"><WifiOff size={13} /> Chưa bật realtime</span>;
  }
  if (sync.connected) {
    return (
      <span className="text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center gap-1.5" title={`Lệch đồng hồ ${sync.clock.offset}ms`}>
        <Wifi size={13} /> Đồng bộ{sync.clock.rtt !== null ? ` · ${sync.clock.rtt}ms` : ''}
      </span>
    );
  }
  if (sync.status === 'error') {
    return <span className="text-[11px] px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 flex items-center gap-1.5" title={sync.error}><WifiOff size={13} /> Mất đồng bộ</span>;
  }
  return <span className="text-[11px] px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Đang kết nối</span>;
}
