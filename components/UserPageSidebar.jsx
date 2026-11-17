'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Shield, LayoutDashboard, UserCircle, Wallet, Library, Users, Settings, ChevronRight, Home, Plus } from 'lucide-react';
import { useUser } from './user/UserContext';
import { AvatarFrame, FactionBadge, EnergyBar } from './user/ui';
import { getEnergy, getTier, formatVnd } from '@/lib/membership';

export const USER_NAV = [
  { href: '/user/dashboard', icon: LayoutDashboard, label: 'Tổng quan', short: 'Tổng quan' },
  { href: '/user/wallet', icon: Wallet, label: 'Nạp Đạn / Ví Hội Viên', short: 'Ví' },
  { href: '/user/library', icon: Library, label: 'Tủ Phim Cá Nhân', short: 'Tủ phim' },
  { href: '/user/watch-party', icon: Users, label: 'Phòng Xem Chung', short: 'Xem chung' },
  { href: '/user/settings', icon: Settings, label: 'Cài đặt hệ phái', short: 'Cài đặt' },
];

export function isNavActive(pathname, href) {
  return pathname === href || pathname?.startsWith(href + '/');
}

export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } finally {
    window.location.href = '/';
  }
}

export default function UserPageSidebar() {
  const { user, faction, now, openTopup } = useUser();
  const pathname = usePathname();
  const t = now();
  const energy = getEnergy(user, t);
  const tier = getTier(user, t);
  const isAdmin = user.role === 'admin' || user.role === 'moderator';

  const linkCls = (active) =>
    `flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition ${
      active
        ? 'bg-[rgb(var(--fx-rgb)/0.12)] text-[var(--fx)] shadow-[inset_0_0_0_1px_rgb(var(--fx-rgb)/0.35)]'
        : 'text-gray-400 hover:bg-white/5 hover:text-white'
    }`;

  return (
    <aside className="hidden md:block w-[260px] shrink-0">
      <div className="sticky top-20 space-y-3">
        {/* Mini card */}
        <div className="rounded-2xl border border-[rgb(var(--fx-rgb)/0.25)] bg-[#121217] p-4">
          <div className="flex items-center gap-3">
            <AvatarFrame user={user} size={52} level={tier.level} />
            <div className="min-w-0">
              <p className="text-white font-bold truncate">{user.username}</p>
              <FactionBadge faction={faction} className="mt-1 !text-[9px] !px-1.5 !py-0.5" />
            </div>
          </div>
          <div className="mt-3"><EnergyBar energy={energy} compact /></div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
            <span className="text-xs text-gray-400">Ví: <b className="text-white tabular-nums">{formatVnd(user.balance)}</b></span>
            <button onClick={() => openTopup('wallet')} className="text-xs font-bold text-[var(--fx)] flex items-center gap-0.5 hover:opacity-80"><Plus size={14} /> Bơm</button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="rounded-2xl border border-white/[0.07] bg-[#121217] p-1.5 space-y-0.5">
          {USER_NAV.map(({ href, icon: Icon, label }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link key={href} href={href} className={linkCls(active)}>
                <span className="flex items-center gap-2.5"><Icon size={16} /> {label}</span>
                <ChevronRight size={13} className={active ? '' : 'text-gray-600'} />
              </Link>
            );
          })}
          <div className="h-px bg-white/5 my-1" />
          <Link href="/user/profile" className={linkCls(isNavActive(pathname, '/user/profile'))}>
            <span className="flex items-center gap-2.5"><UserCircle size={16} /> Hồ sơ & mật khẩu</span>
            <ChevronRight size={13} className="text-gray-600" />
          </Link>
          {isAdmin && (
            <Link href="/admin" className={linkCls(false)}>
              <span className="flex items-center gap-2.5"><Shield size={16} className="text-red-400" /> Trang Admin</span>
              <ChevronRight size={13} className="text-gray-600" />
            </Link>
          )}
        </nav>

        <div className="rounded-2xl border border-white/[0.07] bg-[#121217] overflow-hidden">
          <Link href="/" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
            <Home size={16} /> Về trang chủ
          </Link>
          <button onClick={logout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 border-t border-white/5">
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </div>
    </aside>
  );
}
