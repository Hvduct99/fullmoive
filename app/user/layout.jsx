
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import { getUserVipState } from '@/lib/vip';
import { 
  User, 
  Clock, 
  Heart, 
  LogOut,
  Home,
  Crown
} from 'lucide-react';

export default async function UserLayout({ children }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Get user info for VIP display
  let userInfo = { role: session.role, username: '' };
  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [session.userId]
    );
    if (users.length > 0) userInfo = users[0];
  } catch (e) {}

  const vipState = getUserVipState(userInfo);

  const menuItems = [
    { icon: <Home size={20} />, label: 'Tổng quan', href: '/user/dashboard' },
    { icon: <User size={20} />, label: 'Hồ sơ cá nhân', href: '/user/profile' },
    { icon: <Clock size={20} />, label: 'Lịch sử xem', href: '/user/history' },
    { icon: <Heart size={20} />, label: 'Phim yêu thích', href: '/user/watchlist' },
  ];

  return (
    <div className="min-h-screen bg-[#111] pt-20 pb-10 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Sidebar */}
        <div className="md:col-span-1">
          <div className="bg-[#1a1a1a] rounded-lg border border-[#333] overflow-hidden">
             <div className="p-6 text-center border-b border-[#333]">
                 <div className={`w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold ${vipState.isVip ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-black' : 'bg-yellow-500 text-black'}`}>
                   {vipState.isVip ? <Crown size={32} /> : 'U'}
                </div>
                <h3 className="text-white font-bold">{userInfo.username || 'Thành viên'}</h3>
                 <span className={`text-xs mt-1 block ${vipState.isVip ? 'text-yellow-500 font-bold' : 'text-gray-400'}`}>
                   {vipState.isVip ? 'VIP Member' : 'Free Member'}
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
