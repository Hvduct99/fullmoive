'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, Play, Trash2, Clock, ArrowLeft } from 'lucide-react';

export default function WatchHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/user/watch-history?limit=50');
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/user/watch-history?id=${id}`, { method: 'DELETE' });
      if (res.ok) setHistory(prev => prev.filter(h => h.id !== id));
    } catch {}
  };

  const handleClearAll = async () => {
    if (!confirm('Xóa toàn bộ lịch sử xem phim?')) return;
    try {
      const res = await fetch('/api/user/watch-history?all=true', { method: 'DELETE' });
      if (res.ok) setHistory([]);
    } catch {}
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  if (loading) return <div className="text-white p-8">Đang tải...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/user/dashboard" className="text-gray-400 hover:text-white transition">
            <ArrowLeft size={20} />
          </Link>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <History size={24} className="text-purple-400" /> Lịch sử xem phim
          </h2>
          <span className="text-sm text-gray-500">({history.length} phim)</span>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 px-3 py-1.5 rounded-lg transition"
          >
            <Trash2 size={13} /> Xóa tất cả
          </button>
        )}
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-12 text-center">
          <Clock size={48} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400 mb-2">Chưa có lịch sử xem phim</p>
          <Link href="/" className="text-yellow-500 hover:underline text-sm">Khám phá phim ngay &rarr;</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(item => (
            <div key={item.id} className="bg-[#1a1a1a] rounded-xl border border-[#333] hover:border-[#444] transition-colors overflow-hidden">
              <div className="flex items-center gap-4 p-3">
                {/* Thumbnail */}
                <Link
                  href={item.episode_slug ? `/phim/${item.movie_slug}/tap-${item.episode_slug}` : `/phim/${item.movie_slug}`}
                  className="relative w-16 h-[88px] sm:w-20 sm:h-[110px] shrink-0 bg-gray-800 rounded-lg overflow-hidden group"
                >
                  {item.movie_thumb ? (
                    <img src={item.movie_thumb} alt={item.movie_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play size={20} className="text-gray-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play size={24} className="text-white" />
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={item.episode_slug ? `/phim/${item.movie_slug}/tap-${item.episode_slug}` : `/phim/${item.movie_slug}`}
                    className="text-sm sm:text-base font-semibold text-white hover:text-yellow-500 transition line-clamp-1"
                  >
                    {item.movie_name}
                  </Link>
                  {item.movie_year && (
                    <p className="text-xs text-gray-500 mt-0.5">{item.movie_year}</p>
                  )}
                  {item.episode_name && (
                    <p className="text-xs text-yellow-500/80 mt-1">
                      <Play size={10} className="inline mr-1" />
                      Đang xem: Tập {item.episode_name}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-600 mt-1 flex items-center gap-1">
                    <Clock size={10} /> {timeAgo(item.watched_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={item.episode_slug ? `/phim/${item.movie_slug}/tap-${item.episode_slug}` : `/phim/${item.movie_slug}`}
                    className="flex items-center gap-1.5 text-xs bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-3 py-1.5 rounded-lg transition"
                  >
                    <Play size={12} /> Tiếp tục
                  </Link>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="Xóa khỏi lịch sử"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
