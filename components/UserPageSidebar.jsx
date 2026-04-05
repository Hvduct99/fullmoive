'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  User, LogOut, Shield, LayoutDashboard, UserCircle,
  History, ChevronRight, Home, Settings, Camera
} from 'lucide-react';

export default function UserPageSidebar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setUser(data.user || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch {
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <aside className="hidden md:block w-[260px] shrink-0">
        <div className="sticky top-20 space-y-3">
          <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-gray-700 mx-auto" />
            <div className="h-4 bg-gray-700 rounded mt-4 w-3/4 mx-auto" />
            <div className="h-3 bg-gray-700 rounded mt-2 w-1/2 mx-auto" />
          </div>
        </div>
      </aside>
    );
  }

  if (!user) return null;

  const isAdmin = user.role === 'admin' || user.role === 'moderator';

  const navItems = [
    { href: '/user/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard', color: 'text-blue-400' },
    { href: '/user/profile', icon: <UserCircle size={16} />, label: 'Hồ sơ cá nhân', color: 'text-green-400' },
    { href: '/user/watch-history', icon: <History size={16} />, label: 'Lịch sử xem', color: 'text-purple-400' },
  ];

  return (
    <aside className="hidden md:block w-[260px] shrink-0">
      <div className="sticky top-20 space-y-3">

        {/* User Profile Card */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-yellow-600/30 via-orange-600/20 to-red-600/10" />
          <div className="px-4 pb-5 -mt-10 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-4 border-[#1a1a1a] bg-yellow-500 text-black mx-auto shadow-lg">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{(user.username || 'U')[0].toUpperCase()}</span>
              )}
            </div>
            <h3 className="text-white font-bold mt-3 text-base truncate">{user.username || 'Thành viên'}</h3>
            <p className="text-xs text-gray-400 truncate mt-0.5">{user.email || ''}</p>
            <span className={`text-[11px] inline-block mt-2 px-3 py-1 rounded-full font-semibold ${
              isAdmin ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-gray-700/50 text-gray-400 border border-gray-600/30'
            }`}>
              {isAdmin ? 'Quản trị viên' : 'Thành viên'}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[#292929]">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Quản lý tài khoản</span>
          </div>
          <nav className="py-1">
            {navItems.map(item => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 text-sm transition-all mx-1 my-0.5 rounded-lg ${
                    isActive
                      ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      : 'text-gray-400 hover:bg-[#252525] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-yellow-400' : item.color}>{item.icon}</span>
                    {item.label}
                  </span>
                  <ChevronRight size={13} className={isActive ? 'text-yellow-500' : 'text-gray-600'} />
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center justify-between px-3.5 py-2.5 text-sm text-gray-400 hover:bg-[#252525] hover:text-white transition-all mx-1 my-0.5 rounded-lg"
              >
                <span className="flex items-center gap-2.5">
                  <Shield size={16} className="text-red-400" /> Trang Admin
                </span>
                <ChevronRight size={13} className="text-gray-600" />
              </Link>
            )}
          </nav>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-400 hover:bg-[#252525] hover:text-white transition-all"
          >
            <Home size={16} className="text-blue-400" /> Về trang chủ
          </Link>
          <div className="border-t border-[#292929]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={16} /> Đăng xuất
            </button>
          </div>
        </div>

      </div>
    </aside>
  );
}
