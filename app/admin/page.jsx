
'use client';

import { useEffect, useState } from 'react';
import { 
  Users, 
  Film, 
  Eye, 
  DollarSign, 
  ArrowUp,
  Activity
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalMovies: 0,
    totalUsers: 0,
    totalViews: 0,
    totalRevenue: 0,
    recentUsers: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-white">Loading stats...</div>;

  const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#333]">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-white">{value}</h3>
          <span className="flex items-center text-green-500 text-sm mt-2">
            <ArrowUp size={14} className="mr-1" />
            +12.5% tuần này
          </span>
        </div>
        <div className={`p-3 rounded-lg bg-opacity-20 ${color} bg-white text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white mb-6">Tổng quan hệ thống</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Tổng phim" 
          value={stats.totalMovies} 
          icon={<Film size={24} />}
          color="bg-blue-600"
        />
        <StatCard 
          title="Thành viên" 
          value={stats.totalUsers} 
          icon={<Users size={24} />}
          color="bg-purple-600"
        />
        <StatCard 
          title="Lượt xem" 
          value={stats.totalViews.toLocaleString()} 
          icon={<Eye size={24} />}
          color="bg-green-600"
        />
        <StatCard 
          title="Doanh thu" 
          value={`${stats.totalRevenue.toLocaleString()} đ`} 
          icon={<DollarSign size={24} />}
          color="bg-yellow-600"
        />
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#333]">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Activity size={20} className="text-yellow-500" />
            Thành viên mới
          </h3>
          <div className="space-y-4">
            {stats.recentUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between border-b border-[#333] pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center text-gray-400">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.username}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-green-900 text-green-200 rounded">
                  Active
                </span>
              </div>
            ))}
            {stats.recentUsers.length === 0 && (
                <p className="text-gray-500">Chưa có thành viên nào.</p>
            )}
          </div>
        </div>

        <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#333]">
          <h3 className="text-lg font-bold text-white mb-4">Biểu đồ tăng trưởng</h3>
          <div className="h-64 flex items-center justify-center text-gray-500 border-2 border-dashed border-[#333] rounded">
            (Biểu đồ sẽ hiển thị tại đây - Cần cài đặt Recharts)
          </div>
        </div>
      </div>
    </div>
  );
}
