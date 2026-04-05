'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, UserCircle, History, Home } from 'lucide-react';

export default function UserMobileNav() {
  const pathname = usePathname();

  const items = [
    { href: '/', icon: <Home size={20} />, label: 'Trang chủ' },
    { href: '/user/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { href: '/user/profile', icon: <UserCircle size={20} />, label: 'Hồ sơ' },
    { href: '/user/watch-history', icon: <History size={20} />, label: 'Lịch sử' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#333] z-[100] px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around">
        {items.map(item => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 px-3 text-[10px] font-medium transition-colors ${
                isActive ? 'text-yellow-400' : 'text-gray-500 active:text-gray-300'
              }`}
            >
              <span className={isActive ? 'text-yellow-400' : ''}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
