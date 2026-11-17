'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { USER_NAV, isNavActive } from './UserPageSidebar';

export default function UserMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0e0e13]/95 backdrop-blur border-t border-white/10 z-[100] pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {USER_NAV.map(({ href, icon: Icon, short }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${active ? 'text-[var(--fx)]' : 'text-gray-500'}`}>
              <Icon size={20} />
              {short}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
