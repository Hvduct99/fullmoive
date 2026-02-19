
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play } from 'lucide-react';

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
  const isVip = user.role === 'vip' || user.role === 'admin';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Xin chào, {user.username || user.full_name} 👋</h2>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#333]">
          <p className="text-gray-400 text-sm mb-1">Gói hiện tại</p>
          <h3 className={`text-2xl font-bold ${isVip ? 'text-yellow-500' : 'text-white'}`}>
            {isVip ? 'VIP Premium' : 'Miễn phí'}
          </h3>
          {isVip ? (
            <p className="text-xs text-gray-500 mt-2">Hết hạn: {new Date(user.vip_expire_at).toLocaleDateString()}</p>
          ) : (
            <Link href="/user/billing" className="text-xs text-yellow-500 mt-2 block hover:underline">
               Nâng cấp ngay &rarr;
            </Link>
          )}
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

      {/* Continue Watching Section - Placeholder for now */}
      <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#333]">
        <h3 className="text-lg font-bold text-white mb-4">Tiếp tục xem</h3>
        <div className="text-center py-8 text-gray-500">
           Bạn chưa xem dở phim nào. <Link href="/" className="text-yellow-500">Khám phá ngay</Link>
        </div>
      </div>
    </div>
  );
}
