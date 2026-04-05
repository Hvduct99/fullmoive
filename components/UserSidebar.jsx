'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User, LogOut, Shield,
  ChevronRight, Settings,
  Home
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

  // Don't render for guests, loading, login/register pages, admin pages, or user management pages
  if (loading || !user) return null;
  if (pathname?.startsWith('/login') || pathname?.startsWith('/register') || pathname?.startsWith('/admin') || pathname?.startsWith('/user')) return null;

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
          <div className="h-14 bg-gradient-to-r from-blue-600/30 to-purple-600/20" />
          <div className="px-4 pb-4 -mt-7">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold border-2 bg-gray-700 text-white border-gray-600">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{(user.username || 'U')[0].toUpperCase()}</span>
              )}
            </div>
            <h3 className="text-white font-bold mt-2 text-sm truncate">{user.username || 'Thành viên'}</h3>
            <span className={`text-[11px] inline-block mt-1 px-2 py-0.5 rounded-full font-semibold ${
              isAdmin ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'
            }`}>
              {isAdmin ? 'Admin' : 'Thành viên'}
            </span>
          </div>
        </div>

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
