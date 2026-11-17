'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Library, History, Heart, Bookmark, Trash2 } from 'lucide-react';
import { Panel, ContinueCard, PosterCard } from '@/components/user/ui';

const TABS = [
  { id: 'history', label: 'Xem dở & Lịch sử', icon: History },
  { id: 'favorite', label: 'Yêu thích', icon: Heart },
  { id: 'saved', label: 'Đã lưu', icon: Bookmark },
];

function LibraryInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'history';
  const [history, setHistory] = useState(null);
  const [items, setItems] = useState(null);

  useEffect(() => {
    if (tab === 'history') {
      setHistory(null);
      fetch('/api/user/watch-history?limit=50', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null)).then((d) => setHistory(d?.history || [])).catch(() => setHistory([]));
    } else {
      setItems(null);
      fetch(`/api/user/library?list=${tab}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null)).then((d) => setItems(d?.items || [])).catch(() => setItems([]));
    }
  }, [tab]);

  const removeHistory = async (item) => {
    const res = await fetch(`/api/user/watch-history?id=${item.id}`, { method: 'DELETE' });
    if (res.ok) setHistory((l) => l.filter((x) => x.id !== item.id));
  };
  const clearHistory = async () => {
    if (!confirm('Xoá toàn bộ lịch sử xem?')) return;
    const res = await fetch('/api/user/watch-history?all=true', { method: 'DELETE' });
    if (res.ok) setHistory([]);
  };
  const removeItem = async (item) => {
    const res = await fetch(`/api/user/library?list=${tab}&slug=${encodeURIComponent(item.movie_slug)}`, { method: 'DELETE' });
    if (res.ok) setItems((l) => l.filter((x) => x.id !== item.id));
  };

  const list = tab === 'history' ? history : items;
  const grid = 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3';

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-white flex items-center gap-2"><Library className="text-[var(--fx)]" /> Tủ Phim Cá Nhân</h1>

      <div className="gz-scroll-x flex gap-1 overflow-x-auto p-1 rounded-xl bg-white/5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => router.replace(`/user/library?tab=${id}`, { scroll: false })}
            className={`flex-1 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${tab === id ? 'bg-[rgb(var(--fx-rgb)/0.15)] text-[var(--fx)] shadow-[inset_0_0_0_1px_rgb(var(--fx-rgb)/0.4)]' : 'text-gray-400 hover:text-white'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <Panel>
        {tab === 'history' && history?.length > 0 && (
          <div className="flex justify-end mb-3">
            <button onClick={clearHistory} className="text-xs text-red-400 hover:underline flex items-center gap-1"><Trash2 size={12} /> Xoá tất cả</button>
          </div>
        )}
        {list === null ? (
          <div className={grid}>{Array.from({ length: 10 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-xl bg-white/5 animate-pulse" />)}</div>
        ) : list.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">
              {tab === 'history' ? 'Chưa xem phim nào.' : tab === 'favorite' ? 'Chưa có phim yêu thích.' : 'Chưa lưu phim nào.'}
            </p>
            <p className="text-xs text-gray-600 mt-1">Bấm ♥ hoặc 🔖 ở trang chi tiết phim để thêm vào tủ.</p>
            <Link href="/" className="inline-block mt-4 text-sm text-[var(--fx)] hover:underline">Khám phá phim →</Link>
          </div>
        ) : tab === 'history' ? (
          <div className={grid}>
            {history.map((item) => (
              <ContinueCard key={item.id} item={item} onRemove={removeHistory} className="w-full" />
            ))}
          </div>
        ) : (
          <div className={grid}>
            {items.map((item) => <PosterCard key={item.id} item={item} onRemove={removeItem} />)}
          </div>
        )}
      </Panel>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-white/5 animate-pulse" />}>
      <LibraryInner />
    </Suspense>
  );
}
