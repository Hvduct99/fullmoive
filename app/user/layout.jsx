import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function UserLayout({ children }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#111] pt-20 pb-10 px-4">
      <div className="max-w-4xl mx-auto">
        {children}
      </div>
    </div>
  );
}
