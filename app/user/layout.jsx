import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import UserPageSidebar from '@/components/UserPageSidebar';
import UserMobileNav from '@/components/UserMobileNav';

export default async function UserLayout({ children }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#111] pt-4 md:pt-6 pb-20 md:pb-10 px-3 md:px-4">
      <div className="max-w-6xl mx-auto flex gap-6">
        {/* Sidebar Navigation - Desktop only */}
        <UserPageSidebar />

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <UserMobileNav />
    </div>
  );
}
