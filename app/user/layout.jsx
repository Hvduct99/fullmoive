import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getUserById, publicUser } from '@/lib/wallet';
import UserPageSidebar from '@/components/UserPageSidebar';
import UserMobileNav from '@/components/UserMobileNav';
import { UserProvider } from '@/components/user/UserContext';

// Trang cá nhân: luôn render theo từng request, không bao giờ cache/prerender.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Dashboard hội viên - GenzMovie',
  robots: { index: false, follow: false },
};

export default async function UserLayout({ children }) {
  const session = await getSession();
  if (!session) redirect('/login?next=/user/dashboard');

  let dbUser = null;
  try {
    dbUser = await getUserById(session.userId);
  } catch (e) {
    console.error('User layout DB error:', e.message);
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-red-400">Máy chủ đang bận, chưa tải được dữ liệu tài khoản.</p>
        <a href="/user/dashboard" className="text-yellow-500 hover:underline">Thử lại</a>
      </div>
    );
  }
  if (!dbUser || dbUser.status === 'banned') redirect('/login?next=/user/dashboard');

  return (
    <UserProvider initialUser={publicUser(dbUser)} serverTime={new Date().toISOString()}>
      <div className="min-h-screen bg-[#0a0a0d] pt-4 md:pt-6 pb-24 md:pb-10 px-3 md:px-4">
        <div className="max-w-6xl mx-auto flex gap-6">
          <UserPageSidebar />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
        <UserMobileNav />
      </div>
    </UserProvider>
  );
}
