import Link from 'next/link';
import { Crown, Lock, Sparkles } from 'lucide-react';

export default function VipGateServer() {
  return (
    <div className="bg-gradient-to-b from-[#1a1a1a] to-[#111] border border-yellow-500/30 rounded-xl p-8 text-center max-w-lg mx-auto">
      <div className="w-20 h-20 bg-yellow-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
        <Crown size={40} className="text-yellow-500" />
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-3">
        <Lock size={20} className="inline mr-2 text-yellow-500" />
        Nội dung dành cho VIP
      </h2>
      
      <p className="text-gray-400 mb-6 leading-relaxed">
        Phim này thuộc danh mục VIP (Hành Động, Kinh Dị, Netflix). Nâng cấp tài khoản VIP để xem ngay!
      </p>

      <div className="bg-[#252525] rounded-lg p-4 mb-6 text-left">
        <h4 className="text-yellow-500 font-bold mb-3 flex items-center gap-2">
          <Sparkles size={16} /> Quyền lợi VIP:
        </h4>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-center gap-2">
            <span className="text-yellow-500">✓</span> Xem phim Hành Động, Kinh Dị mới nhất
          </li>
          <li className="flex items-center gap-2">
            <span className="text-yellow-500">✓</span> Truy cập toàn bộ phim Netflix
          </li>
          <li className="flex items-center gap-2">
            <span className="text-yellow-500">✓</span> Chất lượng Full HD / 4K
          </li>
          <li className="flex items-center gap-2">
            <span className="text-yellow-500">✓</span> Không quảng cáo
          </li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link 
          href="/user/dashboard" 
          className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold py-3 px-8 rounded-lg transition-all shadow-lg hover:shadow-yellow-500/25"
        >
          <Crown size={16} className="inline mr-2" />
          Nâng cấp VIP
        </Link>
        <Link 
          href="/" 
          className="bg-[#333] hover:bg-[#444] text-white font-medium py-3 px-8 rounded-lg transition-colors"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
