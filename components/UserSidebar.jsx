'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Crown, User, Clock, Heart, LogOut, Shield,
  Wallet, ChevronRight, Star, Zap, Settings
} from 'lucide-react';

export default function UserSidebar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        setUser(data.user || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Don't render anything for guests or while loading
  if (loading || !user) return null;

  const isVip = user.isVip;
  const isAdmin = user.role === 'admin' || user.role === 'moderator';

  return (
    <aside className="hidden lg:block w-[260px] shrink-0 pt-6">
      <div className="sticky top-20 space-y-4">

        {/* User Profile Card */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
          {/* Header gradient */}
          <div className={`h-16 ${isVip ? 'bg-gradient-to-r from-yellow-600/40 to-yellow-500/20' : 'bg-gradient-to-r from-blue-600/30 to-purple-600/20'}`} />

          <div className="px-4 pb-4 -mt-8">
            {/* Avatar */}
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-2 ${isVip ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-black border-yellow-500' : 'bg-gray-700 text-white border-gray-600'}`}>
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : isVip ? (
                <Crown size={24} />
              ) : (
                <span>{(user.username || 'U')[0].toUpperCase()}</span>
              )}
            </div>

            {/* Name & Role */}
            <h3 className="text-white font-bold mt-2 text-sm">{user.username || 'Thành viên'}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                isAdmin ? 'bg-red-500/20 text-red-400' :
                isVip ? 'bg-yellow-500/20 text-yellow-500' :
                'bg-gray-700 text-gray-400'
              }`}>
                {isAdmin ? 'Admin' : isVip ? 'VIP Premium' : 'Free Member'}
              </span>
            </div>
          </div>
        </div>

        {/* Balance & VIP Status */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <Wallet size={14} /> Số dư tài khoản
            </span>
          </div>
          <p className="text-xl font-bold text-white">0 <span className="text-sm text-gray-500">VNĐ</span></p>

          <div className="mt-3 pt-3 border-t border-[#333]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Trạng thái VIP</span>
              <span className={`text-xs font-bold ${isVip ? 'text-yellow-500' : 'text-gray-500'}`}>
                {isVip ? 'Đang hoạt động' : 'Chưa kích hoạt'}
              </span>
            </div>
            {user.vipExpireAt && isVip && (
              <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                <Clock size={11} /> Hết hạn: {new Date(user.vipExpireAt).toLocaleDateString('vi-VN')}
              </p>
            )}
            {isVip && !user.vipExpireAt && (
              <p className="text-[11px] text-yellow-500 mt-1">VIP Vĩnh viễn</p>
            )}
          </div>
        </div>

        {/* VIP Activation (non-VIP users) */}
        {!isVip && (
          <div className="bg-gradient-to-br from-yellow-500/10 to-[#1a1a1a] rounded-xl border border-yellow-500/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-yellow-500" />
              <span className="text-sm font-bold text-yellow-500">Kích hoạt VIP</span>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">
              Mở khóa phim Hành Động, Kinh Dị, Netflix và nội dung độc quyền!
            </p>
            <div className="space-y-1.5 mb-3">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-300">
                <Star size={10} className="text-yellow-500" /> Phim VIP không giới hạn
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-300">
                <Star size={10} className="text-yellow-500" /> Chất lượng Full HD / 4K
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-300">
                <Star size={10} className="text-yellow-500" /> Không quảng cáo
              </div>
            </div>
            <p className="text-[11px] text-gray-500 text-center">Liên hệ Admin để nâng cấp</p>
          </div>
        )}

        {/* Navigation Menu */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
          <nav className="divide-y divide-[#292929]">
            <Link href="/user/profile" className="flex items-center justify-between px-4 py-3 text-sm text-gray-300 hover:bg-[#252525] hover:text-white transition-colors">
              <span className="flex items-center gap-2.5">
                <User size={15} className="text-blue-400" /> Hồ sơ cá nhân
              </span>
              <ChevronRight size={14} className="text-gray-600" />
            </Link>
            <Link href="/user/dashboard" className="flex items-center justify-between px-4 py-3 text-sm text-gray-300 hover:bg-[#252525] hover:text-white transition-colors">
              <span className="flex items-center gap-2.5">
                <Settings size={15} className="text-green-400" /> Quản lý tài khoản
              </span>
              <ChevronRight size={14} className="text-gray-600" />
            </Link>
            {isAdmin && (
              <Link href="/admin" className="flex items-center justify-between px-4 py-3 text-sm text-gray-300 hover:bg-[#252525] hover:text-white transition-colors">
                <span className="flex items-center gap-2.5">
                  <Shield size={15} className="text-red-400" /> Trang Admin
                </span>
                <ChevronRight size={14} className="text-gray-600" />
              </Link>
            )}
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-[#252525] transition-colors">
                <LogOut size={15} /> Đăng xuất
              </button>
            </form>
          </nav>
        </div>

      </div>
    </aside>
  );
}
