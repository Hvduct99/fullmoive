
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { 
  rxDashboard, 
  LayoutDashboard, 
  Users, 
  Film, 
  Settings, 
  CreditCard, 
  MessageSquare,
  LogOut
} from 'lucide-react';

export default async function AdminLayout({ children }) {
  const session = await getSession();

  if (!session || (session.role !== 'admin' && session.role !== 'moderator')) {
    redirect('/login');
  }

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', href: '/admin' },
    { icon: <Users size={20} />, label: 'Quản lý Users', href: '/admin/users' },
    { icon: <Film size={20} />, label: 'Quản lý Phim', href: '/admin/movies' },
    { icon: <MessageSquare size={20} />, label: 'Bình luận/Đánh giá', href: '/admin/comments' },
    { icon: <CreditCard size={20} />, label: 'Giao dịch & VIP', href: '/admin/billing' },
    { icon: <Settings size={20} />, label: 'Cấu hình hệ thống', href: '/admin/settings' },
  ];

  return (
    <div className="flex min-h-screen bg-[#111]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1a1a] border-r border-[#333] hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-yellow-500">Admin Panel</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#333] hover:text-white rounded transition-colors"
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[#333]">
          <div className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-[#333] rounded cursor-pointer">
            <LogOut size={20} />
            <span>Đăng xuất</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-[#1a1a1a] h-16 border-b border-[#333] flex items-center justify-between px-8 md:hidden">
           <h1 className="text-xl font-bold text-yellow-500">Admin</h1>
           {/* Mobile menu toggle would go here */}
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
