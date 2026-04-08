'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Play, Trash2, LayoutDashboard, UserCircle, History, Clock } from 'lucide-react';

export default function UserDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchHistory, setWatchHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      fetch('/api/user/profile').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/user/watch-history?limit=12').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([p, h]) => {
      setProfile(p);
      setWatchHistory(h?.history || []);
    }).finally(() => setLoading(false));
  }, []);

  const removeHistory = async (id) => {
    const res = await fetch(`/api/user/watch-history?id=${id}`, { method: 'DELETE' });
    if (res.ok) setWatchHistory(prev => prev.filter(h => h.id !== id));
  };

  const clearAllHistory = async () => {
    if (!confirm('Xóa toàn bộ lịch sử xem?')) return;
    const res = await fetch('/api/user/watch-history?all=true', { method: 'DELETE' });
    if (res.ok) setWatchHistory([]);
  };

  if (loading) return <div className="text-white p-8">Đang tải...</div>;
  if (!profile?.user) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">Không thể tải thông tin.</p>
        <a href="/login" className="text-yellow-500 hover:underline">Đăng nhập lại</a>
      </div>
    );
  }

  const { user } = profile;
  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: <LayoutDashboard size={16} /> },
    { id: 'history', label: 'Lịch sử xem', icon: <History size={16} /> },
    { id: 'profile', label: 'Chỉnh sửa hồ sơ', icon: <UserCircle size={16} /> },
    { id: 'donate', label: 'Ủng hộ', icon: <Heart size={16} /> },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Xin chào, {user.username}</h2>

      {/* Navbar Tabs */}
      <div className="flex gap-1 overflow-x-auto bg-[#1a1a1a] rounded-xl p-1 border border-[#333]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => tab.id === 'profile' ? (window.location.href = '/user/profile') : setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'text-gray-400 hover:text-white hover:bg-[#252525]'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tổng quan */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1a1a1a] p-5 rounded-xl border border-[#333]">
              <p className="text-gray-400 text-sm mb-1">Số dư ví</p>
              <h3 className="text-xl font-bold text-yellow-400">{Number(user.balance || 0).toLocaleString()} đ</h3>
            </div>
            <div className="bg-[#1a1a1a] p-5 rounded-xl border border-[#333]">
              <p className="text-gray-400 text-sm mb-1">Phim đã xem</p>
              <h3 className="text-xl font-bold text-white">{watchHistory.length}</h3>
            </div>
            <div className="bg-[#1a1a1a] p-5 rounded-xl border border-[#333]">
              <p className="text-gray-400 text-sm mb-1">Email</p>
              <h3 className="text-sm font-bold text-white truncate">{user.email}</h3>
            </div>
          </div>

          {/* Xem gần đây */}
          {watchHistory.length > 0 && (
            <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock size={18} className="text-purple-400" /> Xem gần đây
                </h3>
                <button onClick={() => setActiveTab('history')} className="text-xs text-yellow-500 hover:underline">Xem tất cả &rarr;</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {watchHistory.slice(0, 6).map(item => (
                  <Link key={item.id} href={item.episode_slug ? `/phim/${item.movie_slug}/tap-${item.episode_slug}` : `/phim/${item.movie_slug}`}
                    className="group bg-[#222] rounded-lg overflow-hidden border border-[#333] hover:border-yellow-500/50 transition-all">
                    <div className="relative aspect-[2/3]">
                      {item.movie_thumb ? (
                        <img src={item.movie_thumb} alt={item.movie_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center"><Play size={24} className="text-gray-600" /></div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play size={28} className="text-white" />
                      </div>
                      {item.episode_name && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-2 py-1">
                          <span className="text-[10px] text-yellow-400 font-semibold">Tập {item.episode_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-white font-medium line-clamp-2 leading-tight">{item.movie_name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Lịch sử xem */}
      {activeTab === 'history' && (
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Lịch sử xem phim</h3>
            {watchHistory.length > 0 && (
              <button onClick={clearAllHistory} className="text-xs text-red-400 hover:underline flex items-center gap-1">
                <Trash2 size={12} /> Xóa tất cả
              </button>
            )}
          </div>
          {watchHistory.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Bạn chưa xem phim nào. <Link href="/" className="text-yellow-500">Khám phá ngay</Link></p>
          ) : (
            <div className="space-y-2">
              {watchHistory.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-[#222] rounded-lg p-3 border border-[#333] hover:border-[#444] transition-colors">
                  <Link href={item.episode_slug ? `/phim/${item.movie_slug}/tap-${item.episode_slug}` : `/phim/${item.movie_slug}`}
                    className="shrink-0 w-12 h-16 bg-gray-800 rounded overflow-hidden">
                    {item.movie_thumb ? (
                      <img src={item.movie_thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Play size={16} className="text-gray-600" /></div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={item.episode_slug ? `/phim/${item.movie_slug}/tap-${item.episode_slug}` : `/phim/${item.movie_slug}`}>
                      <p className="text-sm text-white font-medium truncate hover:text-yellow-400">{item.movie_name}</p>
                    </Link>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      {item.episode_name && <span className="text-yellow-500">Tập {item.episode_name}</span>}
                      {item.movie_year && <span>{item.movie_year}</span>}
                      <span>{new Date(item.watched_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                  <button onClick={() => removeHistory(item.id)} className="shrink-0 text-gray-600 hover:text-red-400 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ủng hộ Admin */}
      {activeTab === 'donate' && (
        <div className="bg-gradient-to-r from-pink-500/10 via-[#1a1a1a] to-red-500/10 border border-pink-500/20 rounded-xl p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="shrink-0">
              <img src="/images/QR.jpg" alt="QR Ủng hộ" className="w-[220px] rounded-lg border border-gray-700 shadow-lg" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
                <Heart size={22} className="text-pink-500" /> Ủng hộ Admin
              </h3>
              <p className="text-sm text-gray-300 mt-3">
                Nếu bạn thấy website hữu ích, hãy ủng hộ admin để có thêm động lực cập nhật phim mới hàng ngày!
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Quét mã QR để chuyển khoản. Mọi đóng góp dù nhỏ đều rất ý nghĩa và giúp duy trì website hoạt động.
              </p>
              <p className="text-sm text-pink-400 mt-4 font-semibold">Cảm ơn bạn rất nhiều!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
