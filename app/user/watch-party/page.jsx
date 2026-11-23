'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Search, Loader2, Plus, LogIn, Film, Crown, Check } from 'lucide-react';
import { Panel, SectionTitle } from '@/components/user/ui';

export default function WatchPartyPage() {
  const router = useRouter();
  const [parties, setParties] = useState(null);
  const [recent, setRecent] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [movie, setMovie] = useState(null);
  const [title, setTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const searchSeq = useRef(0);

  useEffect(() => {
    fetch('/api/watch-party', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => setParties(d?.parties || [])).catch(() => setParties([]));
    fetch('/api/user/watch-history?limit=8', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => setRecent(d?.history || [])).catch(() => {});
  }, []);

  // Tìm phim (debounce 400ms, bỏ kết quả cũ về muộn)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/search?keyword=${encodeURIComponent(q)}`);
        const d = await r.json();
        if (seq === searchSeq.current) setResults((d.data || []).slice(0, 8));
      } catch { /* bỏ qua */ } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const pick = (m) => {
    setMovie(m);
    setResults([]);
    setQuery('');
    if (!title) setTitle(`Cày ${m.movie_name} cùng hội`);
  };

  const create = async () => {
    if (!movie) return setError('Chọn phim trước đã nhé');
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/watch-party', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, ...movie }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || 'Không tạo được phòng');
      router.push(`/user/watch-party/${d.code}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const join = (e) => {
    e.preventDefault();
    const code = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) return setError('Mã phòng chưa đúng');
    router.push(`/user/watch-party/${code}`);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-white flex items-center gap-2"><Users className="text-[var(--fx)]" /> Phòng Xem Chung</h1>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Tạo phòng */}
        <Panel className="lg:col-span-3">
          <SectionTitle icon={<Plus size={18} />} title="Mở phòng mới" />
          <div className="space-y-3">
            {movie ? (
              <div className="flex items-center gap-3 rounded-xl border border-[rgb(var(--fx-rgb)/0.4)] bg-[rgb(var(--fx-rgb)/0.06)] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {movie.movie_thumb ? <img src={movie.movie_thumb} alt="" className="w-10 h-14 object-cover rounded" /> : <Film className="text-gray-600" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold truncate">{movie.movie_name}</p>
                  <p className="text-[11px] text-gray-500">{movie.episode_slug ? `Bắt đầu từ tập ${movie.episode_slug}` : 'Từ tập đầu tiên'}</p>
                </div>
                <button onClick={() => setMovie(null)} className="text-xs text-gray-400 hover:text-white px-2">Đổi</button>
              </div>
            ) : (
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm phim muốn xem chung…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-9 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--fx)]" />
                {searching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-500" />}
                {results.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-[#16161c] shadow-2xl">
                    {results.map((r) => (
                      <li key={r.slug}>
                        <button onClick={() => pick({ movie_slug: r.slug, movie_name: r.name, movie_thumb: r.poster_url || r.thumb_url, episode_slug: null })}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left">
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

            {!movie && recent.length > 0 && (
              <div>
                <p className="text-[11px] text-gray-500 mb-1.5">Hoặc chọn nhanh từ phim đang xem:</p>
                <div className="flex flex-wrap gap-1.5">
                  {recent.map((h) => (
                    <button key={h.id} onClick={() => pick({ movie_slug: h.movie_slug, movie_name: h.movie_name, movie_thumb: h.movie_thumb, episode_slug: h.episode_slug })}
                      className="text-xs px-2.5 py-1 rounded-full border border-white/10 text-gray-300 hover:border-[var(--fx)] hover:text-[var(--fx)] max-w-[200px] truncate">
                      {h.movie_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} placeholder="Tên phòng (VD: Hội cày phim tối thứ 7)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--fx)]" />

            <button onClick={create} disabled={busy || !movie}
              className="w-full py-3 rounded-xl font-black text-black bg-gradient-to-r from-[var(--fx2)] to-[var(--fx)] hover:brightness-110 disabled:opacity-40 flex items-center justify-center gap-2">
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Mở phòng & lấy link mời
            </button>
          </div>
        </Panel>

        {/* Vào phòng */}
        <Panel className="lg:col-span-2">
          <SectionTitle icon={<LogIn size={18} />} title="Vào phòng bằng mã" />
          <form onSubmit={join} className="space-y-3">
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 12))} placeholder="VD: K7PX2M"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-xl tracking-[0.4em] font-black text-white placeholder:text-gray-700 placeholder:tracking-normal placeholder:text-sm placeholder:font-normal focus:outline-none focus:border-[var(--fx)]" />
            <button className="w-full py-3 rounded-xl font-bold border border-[var(--fx)] text-[var(--fx)] hover:bg-[rgb(var(--fx-rgb)/0.1)]">Vào phòng</button>
          </form>
          <p className="text-[11px] text-gray-500 mt-3">Play, pause, tua được đồng bộ realtime cho cả phòng, vào trễ vẫn xem đúng đoạn đang chiếu. Chat trực tiếp ngay trong phòng.</p>
        </Panel>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

      <Panel>
        <SectionTitle icon={<Users size={18} />} title="Phòng của bạn" />
        {parties === null ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}</div>
        ) : parties.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">Chưa có phòng nào. Mở phòng đầu tiên và rủ hội bạn vào thôi!</p>
        ) : (
          <ul className="space-y-2">
            {parties.map((p) => (
              <li key={p.id}>
                <Link href={`/user/watch-party/${p.code}`} className={`flex items-center gap-3 rounded-xl border p-2.5 transition ${p.status === 'open' ? 'border-white/10 hover:border-[var(--fx)]' : 'border-white/5 opacity-50'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.movie_thumb ? <img src={p.movie_thumb} alt="" className="w-10 h-14 object-cover rounded" /> : <div className="w-10 h-14 rounded bg-gray-800" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-semibold truncate">{p.title}</p>
                    <p className="text-[11px] text-gray-500 truncate">{p.movie_name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-[var(--fx)]">#{p.code}</span>
                      <span>{p.member_count} người</span>
                      {p.is_host && <span className="flex items-center gap-0.5 text-yellow-400"><Crown size={11} /> Chủ phòng</span>}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${p.status === 'open' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
                    {p.status === 'open' ? <><Check size={10} className="inline -mt-0.5" /> Đang mở</> : 'Đã đóng'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
