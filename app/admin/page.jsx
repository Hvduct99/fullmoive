'use client';

import { useEffect, useState } from 'react';
import { Users, Crown, DollarSign, Activity, Clock } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-8">Đang tải...</div>;
  if (!stats) return <div className="text-red-400 p-8">Lỗi tải dữ liệu</div>;

  const cards = [
    { title: 'Thành viên', value: stats.totalUsers, color: 'bg-purple-600', icon: <Users size={24} /> },
    { title: 'Thành viên VIP', value: stats.totalVipUsers, color: 'bg-yellow-600', icon: <Crown size={24} /> },
    { title: 'Doanh thu VIP', value: `${Number(stats.totalRevenue).toLocaleString()} đ`, color: 'bg-green-600', icon: <DollarSign size={24} /> },
    { title: 'Tổng số dư', value: `${Number(stats.totalBalance).toLocaleString()} đ`, color: 'bg-blue-600', icon: <DollarSign size={24} /> },
    { title: 'GD chờ duyệt', value: stats.pendingTransactions, color: 'bg-red-600', icon: <Clock size={24} /> },
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white">Tổng quan hệ thống</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-[#1a1a1a] p-5 rounded-lg border border-[#333]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm mb-1">{card.title}</p>
                <h3 className="text-2xl font-bold text-white">{card.value}</h3>
              </div>
              <div className={`p-2.5 rounded-lg ${card.color} bg-opacity-20 text-white`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#333]">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Activity size={20} className="text-yellow-500" /> Thành viên mới
        </h3>
        <div className="space-y-3">
          {stats.recentUsers?.map(user => (
            <div key={user.id} className="flex items-center justify-between border-b border-[#333] pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  user.role === 'vip' ? 'bg-yellow-500 text-black' : 'bg-[#333] text-gray-400'
                }`}>
                  {user.role === 'vip' ? <Crown size={16} /> : user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium">{user.username}</p>
                  <p className="text-xs text-gray-500">{new Date(user.created_at).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                user.status === 'banned' ? 'bg-red-900 text-red-200' :
                user.role === 'vip' ? 'bg-yellow-900 text-yellow-200' :
                'bg-green-900 text-green-200'
              }`}>
                {user.status === 'banned' ? 'Banned' : user.role === 'vip' ? 'VIP' : 'Active'}
              </span>
            </div>
          ))}
          {(!stats.recentUsers || stats.recentUsers.length === 0) && (
            <p className="text-gray-500">Chưa có thành viên nào.</p>
          )}
        </div>
      </div>
    </div>
  );
}
