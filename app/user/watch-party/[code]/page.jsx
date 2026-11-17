'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Check, Crown, Send, Loader2, Play, Users, X, Timer } from 'lucide-react';
import { useUser } from '@/components/user/UserContext';
import { getFaction } from '@/lib/membership';

const POLL_MS = 3000;

export default function WatchPartyRoom({ params }) {
  const code = String(params.code || '').toUpperCase();
  const router = useRouter();
  const { user } = useUser();
  const [state, setState] = useState(null); // { party, isHost, isMember, members }
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [movie, setMovie] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const offsetRef = useRef(0);
  const lastIdRef = useRef(0);
  const joinedRef = useRef(false);
  const chatRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/watch-party/${code}?after=${lastIdRef.current}`, { cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.message || 'Không tải được phòng'); return; }
      offsetRef.current = new Date(d.serverTime).getTime() - Date.now();
      setState({ party: d.party, isHost: d.isHost, isMember: d.isMember, members: d.members });
      if (d.messages?.length) {
        lastIdRef.current = d.messages[d.messages.length - 1].id;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...d.messages.filter((m) => !seen.has(m.id))].slice(-200);
        });
      }
      // Tự vào phòng ở lần mở đầu tiên
      if (!d.isMember && d.party.status === 'open' && !joinedRef.current) {
        joinedRef.current = true;
        const j = await fetch(`/api/watch-party/${code}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join' }) });
        if (!j.ok) { const jd = await j.json().catch(() => ({})); setError(jd.message || 'Không vào được phòng'); }
        else load();
      }
    } catch { /* mạng chập chờn */ }
  }, [code]);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, POLL_MS);
    const c = setInterval(() => setNowMs(Date.now()), 250);
    return () => { clearInterval(t); clearInterval(c); };
  }, [load]);

  // Tải danh sách tập để nhúng player
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
  const currentEp = episodes.find((e) => e.slug === party?.episode_slug) || episodes[0];
  const serverNow = nowMs + offsetRef.current;
  const startsAt = party?.starts_at ? new Date(party.starts_at).getTime() : null;
  const secondsToStart = startsAt ? Math.ceil((startsAt - serverNow) / 1000) : null;
  const started = startsAt !== null && secondsToStart <= 0;

  const act = async (action, extra = {}) => {
    const res = await fetch(`/api/watch-party/${code}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.message || 'Lỗi');
    return d;
  };

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try { await act('message', { content }); setText(''); await load(); }
    catch (err) { setError(err.message); }
    finally { setSending(false); }
  };

  const startCountdown = async (epSlug) => {
    try { await act('start', { episode_slug: epSlug || currentEp?.slug }); await load(); }
    catch (err) { setError(err.message); }
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
  const online = state.members.filter((m) => m.online).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/user/watch-party" className="p-2 rounded-lg bg-white/5 text-gray-300 hover:text-white" aria-label="Quay lại"><ArrowLeft size={18} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-xl font-black text-white truncate">{party.title}</h1>
          <p className="text-xs text-gray-400 truncate">{party.movie_name} · Chủ phòng: {party.host_name}</p>
        </div>
        <button onClick={copyLink} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[rgb(var(--fx-rgb)/0.5)] text-[var(--fx)] text-sm font-bold hover:bg-[rgb(var(--fx-rgb)/0.1)]">
          {copied ? <Check size={16} /> : <Copy size={16} />} <span className="font-mono">#{code}</span>
        </button>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 flex justify-between">{error}<button onClick={() => setError('')}><X size={14} /></button></p>}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Player */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
            {started && currentEp?.link_embed && !closed ? (
              <iframe key={`${currentEp.slug}-${startsAt}`} src={currentEp.link_embed} className="absolute inset-0 w-full h-full" allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {(movie?.thumb_url || party.movie_thumb) && <img src={movie?.thumb_url || party.movie_thumb} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-[2px]" />}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  {closed ? (
                    <p className="text-white font-bold">Phòng đã đóng.</p>
                  ) : secondsToStart !== null && secondsToStart > 0 ? (
                    <>
                      <p className="text-sm text-gray-300">Chuẩn bị bấm Play sau</p>
                      <p className="text-7xl font-black text-[var(--fx)] drop-shadow-[0_0_30px_rgb(var(--fx-rgb)/0.9)] tabular-nums">{secondsToStart}</p>
                    </>
                  ) : (
                    <>
                      <Timer className="text-[var(--fx)] mb-2" size={36} />
                      <p className="text-white font-bold">{state.isHost ? 'Cả hội vào đủ chưa? Bấm đếm ngược để cùng xem!' : 'Đang chờ chủ phòng bắt đầu…'}</p>
                      {state.isHost && (
                        <button onClick={() => startCountdown()} className="mt-4 px-6 py-3 rounded-xl font-black text-black bg-gradient-to-r from-[var(--fx2)] to-[var(--fx)] shadow-[0_0_30px_-4px_rgb(var(--fx-rgb)/0.8)] flex items-center gap-2">
                          <Play size={18} fill="currentColor" /> Đếm ngược 10s
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {started && !closed && <p className="text-[11px] text-gray-500">Mẹo: cả hội bấm ▶ cùng lúc ngay khi player hiện ra để xem đồng bộ.{state.isHost && ' Chủ phòng có thể bấm đếm ngược lại bất cứ lúc nào.'}</p>}

          {episodes.length > 1 && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#121217] p-3">
              <p className="text-xs text-gray-400 mb-2">{state.isHost ? 'Chọn tập (bấm để đếm ngược tập đó):' : 'Tập đang chiếu:'}</p>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5 max-h-40 overflow-y-auto">
                {episodes.map((ep) => {
                  const active = ep.slug === currentEp?.slug;
                  return (
                    <button key={ep.slug} disabled={!state.isHost || closed} onClick={() => startCountdown(ep.slug)}
                      className={`py-1.5 rounded text-xs font-semibold ${active ? 'bg-[var(--fx)] text-black' : 'bg-white/5 text-gray-300 enabled:hover:bg-white/10'} disabled:cursor-default`}>
                      {ep.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {state.isHost && !closed && (
              <button onClick={async () => { if (confirm('Đóng phòng này?')) { try { await act('close'); load(); } catch (e) { setError(e.message); } } }}
                className="text-xs px-3 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10">Đóng phòng</button>
            )}
            {!state.isHost && state.isMember && (
              <button onClick={async () => { try { await act('leave'); router.push('/user/watch-party'); } catch (e) { setError(e.message); } }}
                className="text-xs px-3 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white">Rời phòng</button>
            )}
          </div>
        </div>

        {/* Thành viên + chat */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#121217] flex flex-col h-[520px]">
          <div className="p-3 border-b border-white/5">
            <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-2"><Users size={14} /> {state.members.length} thành viên · <span className="text-emerald-400">{online} online</span></p>
            <div className="flex -space-x-2 overflow-hidden">
              {state.members.slice(0, 12).map((m) => (
                <div key={m.id} title={m.username} className="relative w-8 h-8 rounded-full border-2 border-[#121217] bg-gray-800 flex items-center justify-center text-[11px] font-bold" style={{ color: getFaction(m.faction).accent }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : (m.username || '?')[0].toUpperCase()}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#121217] ${m.online ? 'bg-emerald-400' : 'bg-gray-600'}`} />
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
    </div>
  );
}
