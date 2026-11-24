'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Radio, Search, Loader2, Play, Crown, Coins, Trophy, X, Film, Clock, Zap, Wallet, Info, MessageCircle, Send, Users, Gift, Trash2 } from 'lucide-react';
import HlsVideo from '@/components/watch-party/HlsVideo';

const QUICK_BIDS = [0, 10000, 20000, 50000, 100000];
const POLL_MS = 10000;
const HARD_SYNC_SEC = 2.5;

const vnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;
const clock = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};

export default function CinemaPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState(null);
  const [videoEl, setVideoEl] = useState(null);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [offLive, setOffLive] = useState(false);
  const [toast, setToast] = useState('');
  const [tick, setTick] = useState(0);
  const [socket, setSocket] = useState(null);
  const [live, setLive] = useState(false);
  const [viewers, setViewers] = useState(null);
  const [me, setMe] = useState(null);
  const offsetRef = useRef(0);
  const nowRef = useRef(null);
  const guardSeekRef = useRef(0);
  const endTimerRef = useRef(null);

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); }, []);
  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);
  const livePos = useCallback(() => {
    const n = nowRef.current;
    return n ? (serverNow() - n.started_at_ms) / 1000 : 0;
  }, [serverNow]);

  // ---------- Tải trạng thái (bù lệch đồng hồ theo RTT) ----------
  const load = useCallback(async () => {
    try {
      const t0 = Date.now();
      const res = await fetch('/api/cinema', { cache: 'no-store' });
      const t1 = Date.now();
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Lỗi tải Rạp Chung');
      offsetRef.current = d.serverTime - (t0 + t1) / 2;
      nowRef.current = d.now;
      setData(d);
      setError('');
      // Hẹn giờ tải lại đúng lúc phim kết thúc → chuyển phim tiếp theo
      clearTimeout(endTimerRef.current);
      if (d.now) {
        const remain = d.now.started_at_ms + d.now.duration_ms - (Date.now() + offsetRef.current);
        endTimerRef.current = setTimeout(load, Math.max(1500, remain + 1500));
      }
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    // Có realtime thì chỉ cần poll thưa (dự phòng); mất realtime thì poll 10 giây
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, live ? 30000 : POLL_MS);
    const c = setInterval(() => setTick((x) => x + 1), 1000);
    return () => { clearInterval(t); clearInterval(c); clearTimeout(endTimerRef.current); };
  }, [load, live]);

  // Người đang xem (để biết tin nhắn nào của mình, quyền xoá tin của admin)
  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' }).then((r) => r.json()).then((d) => setMe(d.user || null)).catch(() => {});
  }, []);

  // Kết nối realtime công khai /cinema: chat + cập nhật hàng chờ ngay lập tức + số người đang xem
  useEffect(() => {
    let s = null;
    let cancelled = false;
    import('socket.io-client').then(({ io }) => {
      if (cancelled) return;
      s = io(`${window.location.origin}/cinema`, {
        path: '/socket.io',
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelayMax: 10000,
      });
      s.on('connect', () => setLive(true));
      s.on('disconnect', () => setLive(false));
      s.on('connect_error', () => setLive(false));
      s.on('presence', (p) => setViewers(p?.viewers ?? null));
      s.on('cinema:refresh', () => load());
      setSocket(s);
    }).catch(() => {});
    return () => { cancelled = true; if (s) { s.removeAllListeners(); s.disconnect(); } };
  }, [load]);

  useEffect(() => {
    if (!data?.loggedIn) { setBalance(null); return; }
    fetch('/api/user/profile', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => d?.user && setBalance(d.user.balance)).catch(() => {});
  }, [data?.loggedIn, data?.queue?.length]);

  // ---------- Đồng bộ player với "giờ chiếu" ----------
  const goLive = useCallback(() => {
    const v = videoEl;
    if (!v || !nowRef.current) return;
    guardSeekRef.current = Date.now() + 3000;
    v.currentTime = Math.min(livePos(), Math.max(0, (v.duration || Infinity) - 0.5));
    const p = v.play();
    if (p?.catch) p.then(() => { setNeedsGesture(false); setOffLive(false); }).catch((e) => { if (e?.name === 'NotAllowedError') setNeedsGesture(true); });
  }, [videoEl, livePos]);

  useEffect(() => {
    const v = videoEl;
    if (!v) return;
    const onMeta = () => {
      goLive();
      // Server chưa đọc được thời lượng chính xác → báo thời lượng thật từ playlist trình duyệt đã tải
      const n = nowRef.current;
      if (n && !n.duration_confirmed && Number.isFinite(v.duration) && v.duration > 0) {
        fetch('/api/cinema', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'duration', m3u8: n.m3u8, started_at_ms: n.started_at_ms, duration_ms: Math.round(v.duration * 1000) }),
        }).then((r) => r.json()).then((d) => { if (d.accepted) load(); }).catch(() => {});
      }
    };
    const onSeeked = () => {
      if (Date.now() < guardSeekRef.current) return;
      // Kênh trực tiếp: không tua được → quay về đúng giờ chiếu
      if (Math.abs(v.currentTime - livePos()) > HARD_SYNC_SEC) { showToast('Rạp Chung chiếu trực tiếp, không tua được'); goLive(); }
    };
    const onPause = () => { if (!v.ended && Date.now() > guardSeekRef.current) setOffLive(true); };
    const onPlay = () => { if (offLive) goLive(); };
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('seeked', onSeeked);
    v.addEventListener('pause', onPause);
    v.addEventListener('play', onPlay);
    return () => {
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('seeked', onSeeked);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('play', onPlay);
    };
  }, [videoEl, goLive, livePos, showToast, offLive, load]);

  // Sửa trôi mỗi 5 giây khi đang xem trực tiếp
  useEffect(() => {
    const t = setInterval(() => {
      const v = videoEl;
      if (!v || v.paused || v.seeking || v.readyState < 3 || offLive) return;
      if (Math.abs(v.currentTime - livePos()) > HARD_SYNC_SEC) {
        guardSeekRef.current = Date.now() + 3000;
        v.currentTime = livePos();
      }
    }, 5000);
    return () => clearInterval(t);
  }, [videoEl, livePos, offLive]);

  const now = data?.now;
  const pos = now ? Math.min(livePos(), now.duration_ms / 1000) : 0;
  const remain = now ? now.duration_ms / 1000 - pos : 0;
  void tick;

  return (
    <div className="container mx-auto px-3 md:px-4 py-5 md:py-8 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
          <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" /></span>
          Rạp Chung
        </h1>
        <span className="text-sm text-gray-400">Cả cộng đồng xem cùng một phim, cùng một giây.</span>
      </div>

      {error && !data && <p className="text-red-400">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Player trực tiếp */}
        <div className="lg:col-span-2 space-y-3 min-w-0">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
            {!data ? (
              <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : !now ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400"><Loader2 className="animate-spin text-primary" /><p className="text-sm">Đang chuẩn bị phim…</p></div>
            ) : (
              <>
                <HlsVideo ref={setVideoEl} src={now.m3u8} poster={now.movie_thumb} />
                <span className="absolute top-3 left-3 z-10 px-2 py-1 rounded bg-red-600 text-white text-[11px] font-black tracking-wider flex items-center gap-1"><Radio size={12} /> TRỰC TIẾP</span>
                {needsGesture && (
                  <button onClick={goLive} className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
                    <span className="w-16 h-16 rounded-full bg-primary text-black flex items-center justify-center"><Play size={28} fill="currentColor" /></span>
                    <span className="font-bold">Đang chiếu — bấm để xem cùng mọi người</span>
                  </button>
                )}
              </>
            )}
          </div>

          {now && (
            <div className="rounded-2xl bg-[#141414] border border-white/10 p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Đang chiếu</p>
                  <Link prefetch={false} href={`/phim/${now.movie_slug}`} className="text-lg font-bold text-white hover:text-primary line-clamp-1">{now.movie_name}</Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {now.episode_name && now.episode_name !== 'Full' ? `Tập ${now.episode_name} · ` : ''}
                    {now.auto
                      ? 'Tự động chọn (chưa có ai đề xuất)'
                      : <>Đề xuất bởi <b className="text-white">{now.requested_by}</b>{now.total_bid > 0 && <> · ưu tiên <b className="text-primary">{vnd(now.total_bid)}</b></>}</>}
                  </p>
                </div>
                {offLive && (
                  <button onClick={goLive} className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold flex items-center gap-1"><Radio size={13} /> Về trực tiếp</button>
                )}
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-red-600" style={{ width: `${(pos / (now.duration_ms / 1000)) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                <span>{clock(pos)} / {clock(now.duration_ms / 1000)}</span>
                <span className="flex items-center gap-1"><Clock size={11} /> Còn {clock(remain)}{data.queue[0] ? ` · Tiếp theo: ${data.queue[0].movie_name}` : ' · Sau đó: phim tự chọn'}</span>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-[#141414] border border-white/10 p-4 text-xs text-gray-400 space-y-1.5">
            <p className="font-bold text-gray-200 flex items-center gap-1.5"><Info size={14} /> Luật Rạp Chung</p>
            <p>• Hàng chờ xếp theo <b className="text-white">tổng tiền ưu tiên</b>: góp càng nhiều càng lên gần #1. Cùng mức tiền thì ai đề xuất trước đứng trước.</p>
            <p>• Ai cũng có thể <b className="text-white">góp thêm</b> cho phim mình thích để đẩy phim lên. Đề xuất phim đã có trong hàng chờ = góp thêm cho phim đó.</p>
            <p>• Phim đang chiếu không bị cắt ngang. Riêng phim <b className="text-white">tự chọn</b> (khi chưa ai đề xuất) sẽ nhường ngay cho phim được đề xuất.</p>
            <p>• Mỗi ngày mỗi người có <b className="text-white">1 lượt đề xuất miễn phí</b> (reset 00:00 giờ Việt Nam). Đề xuất có ưu tiên thì không giới hạn lượt.</p>
            <p>• Huỷ đề xuất trước khi tới lượt, hoặc phim lỗi nguồn → <b className="text-white">hoàn tiền</b> cho tất cả người đã góp. Phim lỗi nguồn còn được trả lại lượt miễn phí.</p>
          </div>
        </div>

        {/* Hàng chờ + đề xuất */}
        <div className="space-y-5 min-w-0">
          <RequestBox data={data} balance={balance} onDone={(msg) => { showToast(msg); load(); }} />
          <ChatBox socket={socket} live={live} viewers={viewers ?? data?.viewers ?? null} me={me} />
          <QueueList data={data} onChanged={(msg) => { showToast(msg); load(); }} />
        </div>
      </div>

      {toast && <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[150] px-4 py-2 rounded-full bg-black/90 border border-white/10 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}

function RequestBox({ data, balance, onDone }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [movie, setMovie] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [episode, setEpisode] = useState('');
  const [bid, setBid] = useState(0);
  // Lượt miễn phí hôm nay: 1 = còn, 0 = đã dùng, null = chưa biết / chưa đăng nhập
  const freeLeft = data?.free ? Number(data.free.freeLeft) : null;
  const nextFreeAt = data?.free?.nextFreeAt || 0;
  useEffect(() => {
    // Hết lượt miễn phí mà đang chọn Free → tự chuyển sang mức ưu tiên thấp nhất
    if (freeLeft === 0 && bid === 0) setBid(10000);
  }, [freeLeft, bid]);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const my = ++seq.current;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const d = await (await fetch(`/api/search?keyword=${encodeURIComponent(q)}`)).json();
        if (my === seq.current) setResults((d.data || []).slice(0, 8));
      } catch { /* bỏ qua */ } finally { if (my === seq.current) setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const pick = async (m) => {
    setMovie({ slug: m.slug, name: m.name, thumb: m.poster_url || m.thumb_url, year: m.year });
    setResults([]); setQuery(''); setEpisodes([]); setEpisode(''); setError('');
    try {
      const d = await (await fetch(`/api/movie/${m.slug}`)).json();
      const server = (d.movie?.episodes || []).find((s) => (s.server_data || []).some((e) => e.link_m3u8));
      const eps = (server?.server_data || []).filter((e) => e.link_m3u8);
      setEpisodes(eps);
      setEpisode(eps[0]?.slug || '');
      if (!eps.length) setError('Phim này chưa có nguồn phát, chọn phim khác nhé');
    } catch { setError('Không tải được danh sách tập'); }
  };

  const amount = custom ? Math.round(Number(String(custom).replace(/\D/g, ''))) : bid;
  const queue = data?.queue || [];
  const existing = movie ? queue.find((q) => q.movie_slug === movie.slug && q.episode_slug === episode) : null;
  // Ước tính thứ hạng: đứng sau mọi phim có tổng tiền >= mình (bằng tiền thì người đến trước đứng trước)
  const estRank = useMemo(() => {
    if (!movie) return null;
    if (existing) {
      const total = existing.total_bid + amount;
      return 1 + queue.filter((q) => q.id !== existing.id && (q.total_bid > total || (q.total_bid === total && q.rank < existing.rank))).length;
    }
    return 1 + queue.filter((q) => q.total_bid >= amount).length;
  }, [movie, existing, amount, queue]);

  const submit = async () => {
    setError('');
    if (!movie || !episode) return setError('Chọn phim và tập trước đã');
    if (amount > 0 && amount < (data?.rules?.minBid || 1000)) return setError(`Ưu tiên tối thiểu ${vnd(data?.rules?.minBid || 1000)} hoặc 0đ`);
    if (amount === 0 && freeLeft === 0) return setError('Hôm nay bạn đã dùng lượt miễn phí. Chọn mức ưu tiên từ 1.000đ nhé!');
    if (balance !== null && amount > balance) return setError('Số dư không đủ, nạp thêm ở mục Ví nhé');
    setBusy(true);
    try {
      const res = await fetch('/api/cinema', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request', movie_slug: movie.slug, episode_slug: episode, bid: amount }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || 'Không đề xuất được');
      setMovie(null); setEpisodes([]); setBid(0); setCustom('');
      onDone(d.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (data && !data.loggedIn) {
    return (
      <div className="rounded-2xl bg-[#141414] border border-white/10 p-4 text-center">
        <p className="text-white font-bold">Muốn chiếu phim bạn thích?</p>
        <p className="text-xs text-gray-400 mt-1">Đăng nhập để đề xuất phim và ưu tiên lên đầu hàng chờ.</p>
        <Link prefetch={false} href="/login?next=/rap-chung" className="inline-block mt-3 px-5 py-2.5 rounded-lg bg-primary text-black font-bold">Đăng nhập</Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#141414] border border-white/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-white font-bold flex items-center gap-2"><Zap size={16} className="text-primary" /> Đề xuất phim</p>
        {balance !== null && <Link prefetch={false} href="/user/wallet" className="text-xs text-gray-400 flex items-center gap-1 hover:text-white"><Wallet size={12} /> {vnd(balance)}</Link>}
      </div>

      {movie ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {movie.thumb ? <img src={movie.thumb} alt="" className="w-10 h-14 object-cover rounded" /> : <Film className="text-gray-600" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-semibold truncate">{movie.name}</p>
            {episodes.length > 1 ? (
              <select value={episode} onChange={(e) => setEpisode(e.target.value)} className="mt-1 w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white">
                {episodes.map((e) => <option key={e.slug} value={e.slug}>Tập {e.name}</option>)}
              </select>
            ) : <p className="text-[11px] text-gray-500">{episodes.length ? 'Phim lẻ' : 'Đang tải…'}</p>}
          </div>
          <button onClick={() => setMovie(null)} className="text-gray-400 hover:text-white p-1" aria-label="Bỏ chọn"><X size={16} /></button>
        </div>
      ) : (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm phim muốn chiếu…"
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary" />
          {searching && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-500" />}
          {results.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl">
              {results.map((r) => (
                <li key={r.slug}>
                  <button onClick={() => pick(r)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.poster_url || r.thumb_url} alt="" className="w-8 h-12 object-cover rounded bg-gray-800" />
                    <span className="min-w-0">
                      <span className="block text-sm text-white truncate">{r.name}</span>
                      <span className="block text-[11px] text-gray-500">{r.year} · {r.episode_current}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <p className="text-[11px] text-gray-500 mb-1.5">Tiền ưu tiên (trừ vào ví) — càng nhiều càng lên trước</p>
        <div className="grid grid-cols-5 gap-1.5">
          {QUICK_BIDS.map((b) => {
            const lockedFree = b === 0 && freeLeft === 0;
            return (
              <button key={b} disabled={lockedFree} onClick={() => { setBid(b); setCustom(''); }}
                title={lockedFree ? 'Đã dùng lượt miễn phí hôm nay' : undefined}
                className={`py-2 rounded-lg text-xs font-bold border disabled:opacity-35 disabled:cursor-not-allowed ${!custom && bid === b ? 'border-primary text-primary bg-primary/10' : 'border-white/10 text-gray-300 hover:border-white/30'}`}>
                {b === 0 ? (lockedFree ? 'Free ✕' : 'Free') : `${b / 1000}k`}
              </button>
            );
          })}
        </div>
        {freeLeft !== null && (
          <p className={`mt-1.5 text-[11px] flex items-center gap-1 ${freeLeft ? 'text-emerald-400' : 'text-gray-500'}`}>
            <Gift size={12} />
            {freeLeft
              ? 'Hôm nay bạn còn 1 lượt đề xuất miễn phí'
              : `Đã dùng lượt miễn phí hôm nay · lượt mới sau ${clock((nextFreeAt - Date.now()) / 1000)}`}
          </p>
        )}
        <input inputMode="numeric" value={custom ? Number(String(custom).replace(/\D/g, '') || 0).toLocaleString('vi-VN') : ''} onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 9))}
          placeholder="Hoặc nhập số khác" className="mt-1.5 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary" />
      </div>

      {movie && estRank && (
        <p className="text-xs text-gray-300 flex items-center gap-1.5">
          <Trophy size={13} className="text-primary" />
          {existing ? 'Phim đã có trong hàng chờ, bạn sẽ góp thêm. ' : ''}Dự kiến đứng <b className="text-primary text-sm">#{estRank}</b> trong hàng chờ
        </p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}

      <button onClick={submit} disabled={busy || !movie || !episode}
        className="w-full py-3 rounded-xl bg-primary text-black font-black disabled:opacity-40 flex items-center justify-center gap-2">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Coins size={16} />}
        {amount > 0 ? `Ưu tiên ${vnd(amount)} & đề xuất` : 'Đề xuất miễn phí'}
      </button>
    </div>
  );
}

function QueueList({ data, onChanged }) {
  const [boosting, setBoosting] = useState(null);
  const [boostAmt, setBoostAmt] = useState('10000');
  const [busy, setBusy] = useState(false);
  const queue = data?.queue || [];

  const act = async (body) => {
    setBusy(true);
    try {
      const res = await fetch('/api/cinema', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (res.status === 401) { window.location.href = '/login?next=/rap-chung'; return; }
      onChanged(d.message || (res.ok ? 'Xong' : 'Có lỗi xảy ra'));
      if (res.ok) setBoosting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-[#141414] border border-white/10 p-4">
      <p className="text-white font-bold flex items-center gap-2 mb-3"><Trophy size={16} className="text-primary" /> Hàng chờ ({queue.length})</p>
      {!data ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}</div>
      ) : queue.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">Chưa có ai đề xuất. Hết phim này sẽ tự chọn phim mới — hoặc đề xuất phim của bạn ngay!</p>
      ) : (
        <ol className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
          {queue.map((q) => (
            <li key={q.id} className={`rounded-xl border p-2.5 ${q.rank === 1 ? 'border-primary/50 bg-primary/5' : 'border-white/10'}`}>
              <div className="flex items-center gap-3">
                <span className={`w-7 text-center font-black ${q.rank === 1 ? 'text-primary' : 'text-gray-500'}`}>{q.rank === 1 ? <Crown size={18} className="mx-auto" /> : `#${q.rank}`}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {q.movie_thumb ? <img src={q.movie_thumb} alt="" className="w-9 h-12 object-cover rounded" /> : <div className="w-9 h-12 rounded bg-gray-800" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold truncate">{q.movie_name}</p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {q.episode_name && q.episode_name !== 'Full' ? `Tập ${q.episode_name} · ` : ''}@{q.requested_by}{q.backers > 1 ? ` +${q.backers - 1} người góp` : ''}
                  </p>
                </div>
                <span className={`text-xs font-black whitespace-nowrap ${q.total_bid > 0 ? 'text-primary' : 'text-gray-500'}`}>{q.total_bid > 0 ? vnd(q.total_bid) : 'Free'}</span>
              </div>
              <div className="flex items-center gap-2 mt-2 pl-10">
                {data.loggedIn && (
                  <button onClick={() => setBoosting(boosting === q.id ? null : q.id)} className="text-[11px] px-2 py-1 rounded-md border border-primary/40 text-primary hover:bg-primary/10 flex items-center gap-1">
                    <Coins size={11} /> Góp thêm
                  </button>
                )}
                {q.my_amount > 0 && <span className="text-[11px] text-gray-400">Bạn đã góp {vnd(q.my_amount)}</span>}
                {q.mine && (
                  <button disabled={busy} onClick={() => confirm('Huỷ đề xuất và hoàn tiền cho mọi người đã góp?') && act({ action: 'cancel', queue_id: q.id })}
                    className="ml-auto text-[11px] text-red-400 hover:underline">Huỷ</button>
                )}
              </div>
              {boosting === q.id && (
                <div className="flex gap-2 mt-2 pl-10">
                  <input inputMode="numeric" value={Number(boostAmt || 0).toLocaleString('vi-VN')} onChange={(e) => setBoostAmt(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary" />
                  <button disabled={busy} onClick={() => act({ action: 'boost', queue_id: q.id, amount: Number(boostAmt) })}
                    className="px-3 rounded-lg bg-primary text-black text-xs font-bold disabled:opacity-50">{busy ? '…' : 'Góp'}</button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const FACTION_COLOR = { boiz: '#22d3ee', girlz: '#ff2d95' };
const hhmm = (ms) => new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

function ChatBox({ socket, live, viewers, me }) {
  const [msgs, setMsgs] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lastIdRef = useRef(0);
  const listRef = useRef(null);
  const stickRef = useRef(true);
  const isMod = me && (me.role === 'admin' || me.role === 'moderator');

  const add = useCallback((list) => {
    if (!list?.length) return;
    setMsgs((prev) => {
      const map = new Map((prev || []).map((m) => [m.id, m]));
      for (const m of list) map.set(m.id, m);
      const merged = [...map.values()].sort((a, b) => a.id - b.id).slice(-200);
      lastIdRef.current = Math.max(lastIdRef.current, merged.length ? merged[merged.length - 1].id : 0);
      return merged;
    });
  }, []);

  const fetchNew = useCallback(async () => {
    try {
      const d = await (await fetch(`/api/cinema/chat?after=${lastIdRef.current}`, { cache: 'no-store' })).json();
      setMsgs((prev) => prev || []);
      add(d.messages || []);
    } catch { /* thử lại lượt sau */ }
  }, [add]);

  // Lịch sử ban đầu
  useEffect(() => { fetchNew(); }, [fetchNew]);

  // Realtime: tin mới / tin bị xoá. Kết nối lại thì tải bù tin bị lỡ.
  useEffect(() => {
    if (!socket) return;
    const onNew = (m) => add([m]);
    const onDel = ({ id }) => setMsgs((prev) => (prev || []).filter((m) => m.id !== id));
    const onConnect = () => fetchNew();
    socket.on('chat:new', onNew);
    socket.on('chat:delete', onDel);
    socket.on('connect', onConnect);
    return () => { socket.off('chat:new', onNew); socket.off('chat:delete', onDel); socket.off('connect', onConnect); };
  }, [socket, add, fetchNew]);

  // Mất realtime → tải tin mới mỗi 4 giây
  useEffect(() => {
    if (live) return;
    const t = setInterval(() => { if (document.visibilityState === 'visible') fetchNew(); }, 4000);
    return () => clearInterval(t);
  }, [live, fetchNew]);

  // Tự cuộn xuống khi có tin mới (trừ khi người dùng đang kéo lên đọc tin cũ)
  useEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);
  const onScroll = () => {
    const el = listRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  const send = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/cinema/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || 'Không gửi được');
      setText('');
      stickRef.current = true;
      add([d.message]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Xoá tin nhắn này?')) return;
    const res = await fetch(`/api/cinema/chat?id=${id}`, { method: 'DELETE' });
    if (res.ok) setMsgs((prev) => (prev || []).filter((m) => m.id !== id));
  };

  return (
    <div className="rounded-2xl bg-[#141414] border border-white/10 flex flex-col h-[420px]">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <p className="text-white font-bold flex items-center gap-2"><MessageCircle size={16} className="text-primary" /> Kênh chat</p>
        <span className="text-[11px] flex items-center gap-1.5 text-gray-400">
          <span className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-400' : 'bg-gray-600'}`} />
          {viewers !== null && viewers !== undefined ? <><Users size={12} /> {viewers} đang xem</> : live ? 'Trực tuyến' : 'Đang kết nối…'}
        </span>
      </div>

      <div ref={listRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {msgs === null ? (
          <div className="h-full flex items-center justify-center"><Loader2 size={18} className="animate-spin text-gray-500" /></div>
        ) : msgs.length === 0 ? (
          <p className="text-xs text-gray-600 text-center mt-10">Chưa có tin nhắn. Chào cả rạp một câu đi!</p>
        ) : msgs.map((m) => {
          const mine = me && m.user_id === me.id;
          const staff = m.role === 'admin' || m.role === 'moderator';
          return (
            <div key={m.id} className={`group flex items-start gap-1.5 text-sm leading-snug ${mine ? 'bg-primary/5 -mx-1 px-1 rounded' : ''}`}>
              <span className="text-[10px] text-gray-600 mt-0.5 shrink-0 tabular-nums">{hhmm(m.created_at_ms)}</span>
              <p className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                {staff && <span className="text-[9px] font-black px-1 py-px rounded bg-red-600 text-white mr-1 align-middle">ADMIN</span>}
                <span className="font-bold mr-1" style={{ color: FACTION_COLOR[m.faction] || '#ccc' }}>{m.username}:</span>
                <span className="text-gray-200">{m.content}</span>
              </p>
              {isMod && (
                <button onClick={() => remove(m.id)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 shrink-0" aria-label="Xoá tin nhắn"><Trash2 size={12} /></button>
              )}
            </div>
          );
        })}
      </div>

      {me ? (
        <form onSubmit={send} className="p-2 border-t border-white/5">
          {error && <p className="text-[11px] text-red-400 px-1 pb-1">{error}</p>}
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value.slice(0, 300))} placeholder="Nhắn gì đó với cả rạp…"
              className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary" />
            <button disabled={busy || !text.trim()} className="px-3 rounded-xl bg-primary text-black disabled:opacity-40" aria-label="Gửi">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          {text.length > 250 && <p className="text-[10px] text-gray-500 text-right pt-0.5">{text.length}/300</p>}
        </form>
      ) : (
        <div className="p-3 border-t border-white/5 text-center">
          <Link prefetch={false} href="/login?next=/rap-chung" className="text-xs text-primary hover:underline">Đăng nhập để chat cùng mọi người</Link>
        </div>
      )}
    </div>
  );
}
