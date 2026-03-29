
'use client';

import { useState, useEffect } from 'react';
import { Search, Shield, Ban, CheckCircle, MoreHorizontal, Crown, X, UserX, UserCheck } from 'lucide-react';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null); // { userId, username, action }
  const [vipDays, setVipDays] = useState(30);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    let url = `/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`;
    if (roleFilter) url += `&role=${roleFilter}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
        setLoading(false);
      });
  };

  useEffect(() => {
    const timeout = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timeout);
  }, [page, search, roleFilter]);

  const handleAction = async (userId, action, days) => {
    setActionLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, vipDays: days })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        fetchUsers();
        setActionModal(null);
      } else {
        setMessage(data.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setMessage('Lỗi kết nối server');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white">Quản lý Thành viên</h2>
        
        <div className="flex gap-3 flex-wrap">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="bg-[#2a2a2a] text-white px-3 py-2 rounded-lg border border-[#333] focus:outline-none focus:border-yellow-500 text-sm"
          >
            <option value="">Tất cả role</option>
            <option value="admin">Admin</option>
            <option value="vip">VIP</option>
            <option value="member">Member</option>
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm user..." 
              className="bg-[#2a2a2a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#333] focus:outline-none focus:border-yellow-500"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/20 text-green-400 text-sm flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')}><X size={14} /></button>
        </div>
      )}

      <div className="bg-[#1a1a1a] rounded-lg border border-[#333] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="bg-[#252525] uppercase text-xs">
            <tr>
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">VIP Expiry</th>
              <th className="px-6 py-3">Số dư</th>
              <th className="px-6 py-3">Joined</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan="6" className="text-center py-6">Loading...</td></tr>
            ) : users.length === 0 ? (
               <tr><td colSpan="6" className="text-center py-6 text-gray-500">Không tìm thấy user nào</td></tr>
            ) : users.map(user => (
              <tr key={user.id} className="border-b border-[#333] hover:bg-[#252525]">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    user.role === 'vip' ? 'bg-yellow-500 text-black' : 'bg-[#333] text-white'
                  }`}>
                    {user.role === 'vip' ? <Crown size={14} /> : user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-medium">{user.username}</div>
                    <div className="text-xs">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <span className={`px-2 py-1 rounded text-xs font-bold ${
                     user.role === 'admin' ? 'bg-red-900 text-red-200' :
                     user.role === 'moderator' ? 'bg-blue-900 text-blue-200' :
                     user.role === 'vip' ? 'bg-yellow-900 text-yellow-200' :
                     'bg-gray-800 text-gray-200'
                   }`}>
                     {user.role === 'vip' && <Crown size={10} className="inline mr-1" />}
                     {user.role.toUpperCase()}
                   </span>
                </td>
                <td className="px-6 py-4">
                  {user.status === 'active' ? (
                    <span className="flex items-center text-green-500 gap-1">
                      <CheckCircle size={14} /> Active
                    </span>
                  ) : (
                    <span className="flex items-center text-red-500 gap-1">
                      <Ban size={14} /> Banned
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {user.role === 'vip' && user.vip_expire_at ? (
                    <span className={`text-xs ${new Date(user.vip_expire_at) < new Date() ? 'text-red-400' : 'text-yellow-400'}`}>
                      {new Date(user.vip_expire_at) < new Date() ? '⚠ Hết hạn ' : ''}
                      {new Date(user.vip_expire_at).toLocaleDateString('vi-VN')}
                    </span>
                  ) : user.role === 'vip' ? (
                    <span className="text-xs text-yellow-400">Vĩnh viễn</span>
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-white font-semibold">{Number(user.balance || 0).toLocaleString()} đ</span>
                </td>
                <td className="px-6 py-4">
                   {new Date(user.created_at).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    {user.role !== 'admin' && user.role !== 'vip' && (
                      <button 
                        onClick={() => setActionModal({ userId: user.id, username: user.username, action: 'grant_vip' })}
                        className="p-1.5 rounded bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 transition" 
                        title="Cấp VIP"
                      >
                        <Crown size={14} />
                      </button>
                    )}
                    {user.role === 'vip' && (
                      <button 
                        onClick={() => handleAction(user.id, 'revoke_vip')}
                        className="p-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition" 
                        title="Thu hồi VIP"
                      >
                        <UserX size={14} />
                      </button>
                    )}
                    {user.role !== 'admin' && user.status === 'active' && (
                      <button 
                        onClick={() => handleAction(user.id, 'ban')}
                        className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition" 
                        title="Ban user"
                      >
                        <Ban size={14} />
                      </button>
                    )}
                    {user.status === 'banned' && (
                      <button 
                        onClick={() => handleAction(user.id, 'unban')}
                        className="p-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition" 
                        title="Unban user"
                      >
                        <UserCheck size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-end gap-2">
        <button 
           disabled={page<=1} 
           onClick={() => setPage(p => p-1)}
           className="px-3 py-1 bg-[#2a2a2a] text-white rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-3 py-1 text-gray-400">Page {page} / {totalPages}</span>
        <button 
           disabled={page>=totalPages} 
           onClick={() => setPage(p => p+1)}
           className="px-3 py-1 bg-[#2a2a2a] text-white rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Grant VIP Modal */}
      {actionModal && actionModal.action === 'grant_vip' && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setActionModal(null)}>
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Crown size={20} className="text-yellow-500" /> Cấp VIP cho {actionModal.username}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Số ngày VIP</label>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 90, 365].map(days => (
                    <button
                      key={days}
                      onClick={() => setVipDays(days)}
                      className={`py-2 rounded text-sm font-medium transition ${
                        vipDays === days 
                          ? 'bg-yellow-500 text-black' 
                          : 'bg-[#333] text-gray-300 hover:bg-[#444]'
                      }`}
                    >
                      {days === 30 ? '1 Tháng' : days === 90 ? '3 Tháng' : '1 Năm'}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  value={vipDays}
                  onChange={(e) => setVipDays(parseInt(e.target.value) || 1)}
                  className="w-full mt-2 bg-[#252525] border border-[#333] rounded p-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                  placeholder="Hoặc nhập số ngày tùy chỉnh"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleAction(actionModal.userId, 'grant_vip', vipDays)}
                  disabled={actionLoading}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2.5 rounded transition disabled:opacity-50"
                >
                  {actionLoading ? 'Đang xử lý...' : `Cấp VIP ${vipDays} ngày`}
                </button>
                <button
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2.5 bg-[#333] text-gray-300 rounded hover:bg-[#444] transition"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
