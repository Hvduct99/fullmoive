'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Crown, User, Clock, LogOut, Shield,
  Wallet, ChevronRight, Star, Zap, Settings,
  Home, Film
} from 'lucide-react';

export default function UserSidebar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        setUser(data.user || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Don't render for guests, loading, login/register pages, or admin pages
  if (loading || !user) return null;
  if (pathname?.startsWith('/login') || pathname?.startsWith('/register') || pathname?.startsWith('/admin')) return null;

  const isVip = user.isVip;
  const isAdmin = user.role === 'admin' || user.role === 'moderator';

  const navItems = [
    { href: '/', icon: <Home size={15} />, label: 'Trang chủ', color: 'text-blue-400' },
    { href: '/user/profile', icon: <User size={15} />, label: 'Hồ sơ cá nhân', color: 'text-green-400' },
    { href: '/user/dashboard', icon: <Settings size={15} />, label: 'Quản lý tài khoản', color: 'text-purple-400' },
    ...(isAdmin ? [{ href: '/admin', icon: <Shield size={15} />, label: 'Trang Admin', color: 'text-red-400' }] : []),
  ];

  return (
    <aside className="hidden lg:block w-[260px] shrink-0">
      <div className="sticky top-16 pt-4 pb-6 space-y-3 max-h-[calc(100vh-64px)] overflow-y-auto scrollbar-thin">

        {/* User Profile Card */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
          <div className={`h-14 ${isVip ? 'bg-gradient-to-r from-yellow-600/40 to-yellow-500/20' : 'bg-gradient-to-r from-blue-600/30 to-purple-600/20'}`} />
          <div className="px-4 pb-4 -mt-7">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold border-2 ${isVip ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-black border-yellow-500' : 'bg-gray-700 text-white border-gray-600'}`}>
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : isVip ? (
                <Crown size={20} />
              ) : (
                <span>{(user.username || 'U')[0].toUpperCase()}</span>
              )}
            </div>
            <h3 className="text-white font-bold mt-2 text-sm truncate">{user.username || 'Thành viên'}</h3>
            <span className={`text-[11px] inline-block mt-1 px-2 py-0.5 rounded-full font-semibold ${
              isAdmin ? 'bg-red-500/20 text-red-400' :
              isVip ? 'bg-yellow-500/20 text-yellow-500' :
              'bg-gray-700 text-gray-400'
            }`}>
              {isAdmin ? 'Admin' : isVip ? 'VIP Premium' : 'Free Member'}
            </span>
          </div>
        </div>

        {/* Balance & VIP Status */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Wallet size={12} /> Số dư
            </span>
          </div>
          <p className="text-lg font-bold text-white">0 <span className="text-xs text-gray-500">VNĐ</span></p>

          <div className="mt-2.5 pt-2.5 border-t border-[#292929]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">VIP</span>
              <span className={`text-[11px] font-bold ${isVip ? 'text-yellow-500' : 'text-gray-500'}`}>
                {isVip ? 'Hoạt động' : 'Chưa kích hoạt'}
              </span>
            </div>
            {user.vipExpireAt && isVip && (
              <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                <Clock size={10} /> Hết hạn: {new Date(user.vipExpireAt).toLocaleDateString('vi-VN')}
              </p>
            )}
            {isVip && !user.vipExpireAt && (
              <p className="text-[10px] text-yellow-500 mt-1">Vĩnh viễn</p>
            )}
          </div>
        </div>

        {/* VIP Activation */}
        {!isVip && (
          <div className="bg-gradient-to-br from-yellow-500/10 to-[#1a1a1a] rounded-xl border border-yellow-500/30 p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap size={14} className="text-yellow-500" />
              <span className="text-xs font-bold text-yellow-500">Kích hoạt VIP</span>
            </div>
            <div className="space-y-1 mb-2.5">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-300">
                <Star size={9} className="text-yellow-500 shrink-0" /> Phim VIP không giới hạn
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-300">
                <Star size={9} className="text-yellow-500 shrink-0" /> Full HD / 4K
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-300">
                <Star size={9} className="text-yellow-500 shrink-0" /> Không quảng cáo
              </div>
            </div>
            <p className="text-[10px] text-gray-500 text-center">Liên hệ Admin để nâng cấp</p>
          </div>
        )}

        {/* Navigation */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
          <nav className="divide-y divide-[#292929]">
            {navItems.map(item => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors ${
                    isActive ? 'bg-[#252525] text-white' : 'text-gray-400 hover:bg-[#252525] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={item.color}>{item.icon}</span> {item.label}
                  </span>
                  <ChevronRight size={13} className={isActive ? 'text-yellow-500' : 'text-gray-600'} />
                </Link>
              );
            })}
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-red-400 hover:bg-[#252525] transition-colors">
                <LogOut size={15} /> Đăng xuất
              </button>
            </form>
          </nav>
        </div>

      </div>
    </aside>
  );
}
