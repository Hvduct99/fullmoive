
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { 
  User, 
  Clock, 
  Heart, 
  CreditCard,
  Settings,
  LogOut,
  Home
} from 'lucide-react';

export default async function UserLayout({ children }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const menuItems = [
    { icon: <Home size={20} />, label: 'Tổng quan', href: '/user/dashboard' },
    { icon: <User size={20} />, label: 'Hồ sơ cá nhân', href: '/user/profile' },
    { icon: <Clock size={20} />, label: 'Lịch sử xem', href: '/user/history' },
    { icon: <Heart size={20} />, label: 'Phim yêu thích', href: '/user/watchlist' },
    { icon: <CreditCard size={20} />, label: 'Gói VIP & Thanh toán', href: '/user/billing' },
  ];

  return (
    <div className="min-h-screen bg-[#111] pt-20 pb-10 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Sidebar */}
        <div className="md:col-span-1">
          <div className="bg-[#1a1a1a] rounded-lg border border-[#333] overflow-hidden">
             <div className="p-6 text-center border-b border-[#333]">
                <div className="w-20 h-20 bg-yellow-500 rounded-full mx-auto mb-3 flex items-center justify-center text-black text-2xl font-bold">
                   U
                </div>
                <h3 className="text-white font-bold">Thành viên</h3>
                <span className="text-xs text-gray-400 block mt-1">
                   {session.role === 'vip' ? 'VIP Member' : 'Free Member'}
                </span>
             </div>
             <nav className="p-2">
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
               
               <div className="mt-2 border-t border-[#333] pt-2">
                 <form action="/api/auth/logout" method="POST">
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-[#333] rounded cursor-pointer text-left">
                       <LogOut size={20} />
                       <span>Đăng xuất</span>
                    </button>
                 </form>
               </div>
             </nav>
          </div>
        </div>

        {/* Content */}
        <div className="md:col-span-3">
           {children}
        </div>
      </div>
    </div>
  );
}
