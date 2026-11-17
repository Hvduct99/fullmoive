'use client';

import { useEffect, useState } from 'react';
import { Heart, Bookmark, Loader2 } from 'lucide-react';

export default function LibraryButtons({ movie }) {
  const [lists, setLists] = useState([]);
  const [loggedIn, setLoggedIn] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!movie?.slug) return;
    fetch(`/api/user/library?slug=${encodeURIComponent(movie.slug)}`, { cache: 'no-store' })
      .then(async (r) => {
        if (r.status === 401) { setLoggedIn(false); return; }
        const d = await r.json();
        setLoggedIn(true);
        setLists(d.lists || []);
      })
      .catch(() => setLoggedIn(false));
  }, [movie?.slug]);

  const toggle = async (list) => {
    if (loggedIn === false) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (busy) return;
    const has = lists.includes(list);
    setBusy(list);
    try {
      const res = has
        ? await fetch(`/api/user/library?list=${list}&slug=${encodeURIComponent(movie.slug)}`, { method: 'DELETE' })
        : await fetch('/api/user/library', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              list,
              movie_slug: movie.slug,
              movie_name: movie.name,
              movie_thumb: movie.poster_url || movie.thumb_url,
              movie_year: movie.year,
            }),
          });
      if (res.ok) setLists((l) => (has ? l.filter((x) => x !== list) : [...l, list]));
    } finally {
      setBusy(null);
    }
  };

  const btn = (list, Icon, label, activeCls) => {
    const active = lists.includes(list);
    return (
      <button type="button" onClick={() => toggle(list)} aria-pressed={active}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded border text-sm font-semibold transition ${active ? activeCls : 'border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'}`}>
        {busy === list ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} fill={active ? 'currentColor' : 'none'} />}
        {label}
      </button>
    );
  };

  return (
    <div className="flex gap-2 mt-2">
      {btn('favorite', Heart, 'Yêu thích', 'border-pink-500/60 text-pink-400 bg-pink-500/10')}
      {btn('saved', Bookmark, 'Lưu xem sau', 'border-amber-500/60 text-amber-400 bg-amber-500/10')}
    </div>
  );
}
