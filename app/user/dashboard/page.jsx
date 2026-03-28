
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Crown, Shield, Clock, Sparkles, Check } from 'lucide-react';

export default function UserDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/profile')
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-white">Loading...</div>;

  const { user, stats } = profile;
  const isVip = Boolean(user.isVip);
  const vipExpired = Boolean(user.vipExpired);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Xin chào, {user.username || user.full_name} 👋</h2>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-6 rounded-lg border ${isVip && !vipExpired ? 'bg-gradient-to-br from-yellow-500/10 to-[#1a1a1a] border-yellow-500/30' : 'bg-[#1a1a1a] border-[#333]'}`}>
          <p className="text-gray-400 text-sm mb-1">Gói hiện tại</p>
          <h3 className={`text-2xl font-bold ${isVip && !vipExpired ? 'text-yellow-500' : 'text-white'}`}>
            {isVip && !vipExpired ? (
              <span className="flex items-center gap-2">
                <Crown size={24} /> VIP Premium
              </span>
            ) : vipExpired ? (
              'VIP đã hết hạn'
            ) : (
              'Miễn phí'
            )}
          </h3>
            {isVip && !vipExpired && user.vipExpireAt ? (
            <p className="text-xs text-gray-500 mt-2">
              <Clock size={12} className="inline mr-1" />
              Hết hạn: {new Date(user.vipExpireAt).toLocaleDateString('vi-VN')}
            </p>
          ) : isVip && !vipExpired && !user.vipExpireAt ? (
            <p className="text-xs text-yellow-500 mt-2">VIP Vĩnh viễn</p>
          ) : null}
        </div>

        <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#333]">
          <p className="text-gray-400 text-sm mb-1">Phim đã xem</p>
          <h3 className="text-2xl font-bold text-white">{stats.watchedMovies}</h3>
          <Link href="/user/history" className="text-xs text-gray-500 mt-2 block hover:underline">
             Xem lịch sử &rarr;
          </Link>
        </div>
        
        <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#333]">
           <p className="text-gray-400 text-sm mb-1">Phim chờ xem</p>
           <h3 className="text-2xl font-bold text-white">0</h3>
           <Link href="/user/watchlist" className="text-xs text-gray-500 mt-2 block hover:underline">
              Danh sách của bạn &rarr;
           </Link>
        </div>
      </div>

      {/* VIP Upgrade Section (show for non-VIP users) */}
      {(!isVip || vipExpired) && (
        <div className="bg-gradient-to-r from-yellow-500/10 via-[#1a1a1a] to-yellow-500/5 p-6 rounded-lg border border-yellow-500/30">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-yellow-500 flex items-center gap-2 mb-2">
                <Crown size={24} /> Nâng cấp VIP
              </h3>
              <p className="text-gray-400 text-sm max-w-md">
                Mở khóa toàn bộ phim Hành Động, Kinh Dị, Netflix và nhiều nội dung độc quyền khác!
              </p>
            </div>
            <div className="shrink-0">
              <p className="text-xs text-gray-500 mb-2 text-center">Liên hệ Admin để nâng cấp</p>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Check size={16} className="text-yellow-500 shrink-0" />
              <span>Phim Hành Động, Kinh Dị mới nhất</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Check size={16} className="text-yellow-500 shrink-0" />
              <span>Toàn bộ phim Netflix</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Check size={16} className="text-yellow-500 shrink-0" />
              <span>Chất lượng Full HD / 4K</span>
            </div>
          </div>
        </div>
      )}

      {/* VIP Content Access (show for VIP users) */}
      {isVip && !vipExpired && (
        <div className="bg-[#1a1a1a] p-6 rounded-lg border border-yellow-500/20">
          <h3 className="text-lg font-bold text-yellow-500 mb-4 flex items-center gap-2">
            <Sparkles size={20} /> Nội dung VIP của bạn
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/the-loai/hanh-dong" className="flex items-center gap-3 bg-[#252525] p-4 rounded-lg hover:bg-[#333] transition-colors">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Shield size={20} className="text-red-500" />
              </div>
              <div>
                <p className="text-white font-medium">Hành Động</p>
                <p className="text-xs text-gray-500">VIP Content</p>
              </div>
            </Link>
            <Link href="/the-loai/kinh-di" className="flex items-center gap-3 bg-[#252525] p-4 rounded-lg hover:bg-[#333] transition-colors">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Shield size={20} className="text-purple-500" />
              </div>
              <div>
                <p className="text-white font-medium">Kinh Dị</p>
                <p className="text-xs text-gray-500">VIP Content</p>
              </div>
            </Link>
            <Link href="/danh-sach/netflix" className="flex items-center gap-3 bg-[#252525] p-4 rounded-lg hover:bg-[#333] transition-colors">
              <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
                <Play size={20} className="text-red-500" />
              </div>
              <div>
                <p className="text-white font-medium">Netflix</p>
                <p className="text-xs text-gray-500">VIP Content</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Continue Watching Section */}
      <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#333]">
        <h3 className="text-lg font-bold text-white mb-4">Tiếp tục xem</h3>
        <div className="text-center py-8 text-gray-500">
           Bạn chưa xem dở phim nào. <Link href="/" className="text-yellow-500">Khám phá ngay</Link>
        </div>
      </div>
    </div>
  );
}
