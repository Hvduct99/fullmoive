'use client';

import { useState, useEffect } from 'react';
import { Search, Ban, CheckCircle, X, UserCheck } from 'lucide-react';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
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
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    const timeout = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timeout);
  }, [page, search, roleFilter]);

  const handleAction = async (userId, action) => {
    setActionLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action })
      });
      const data = await res.json();
      setMessage(data.message || (res.ok ? 'Thành công' : 'Có lỗi'));
      if (res.ok) fetchUsers();
    } catch { setMessage('Lỗi kết nối server'); }
    finally { setActionLoading(false); }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white">Quản lý Thành viên</h2>
        <div className="flex gap-3 flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="bg-[#2a2a2a] text-white px-3 py-2 rounded-lg border border-[#333] focus:outline-none focus:border-yellow-500 text-sm"
          >
            <option value="">Tất cả role</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Số dư</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-6">Đang tải...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-6 text-gray-500">Không tìm thấy user nào</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="border-b border-[#333] hover:bg-[#252525]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 bg-[#333] text-white">
                        {(user.username || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">{user.username}</div>
                        <div className="text-xs truncate">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      user.role === 'admin' ? 'bg-red-900 text-red-200' : 'bg-gray-800 text-gray-200'
                    }`}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.status === 'banned' ? (
                      <span className="flex items-center text-red-500 gap-1"><Ban size={14} /> Banned</span>
                    ) : (
                      <span className="flex items-center text-green-500 gap-1"><CheckCircle size={14} /> Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white font-semibold">{Number(user.balance || 0).toLocaleString()} đ</span>
                  </td>
                  <td className="px-4 py-3">{new Date(user.created_at).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {user.role !== 'admin' && user.status !== 'banned' && (
                        <button onClick={() => handleAction(user.id, 'ban')}
                          className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30" title="Ban">
                          <Ban size={14} />
                        </button>
                      )}
                      {user.status === 'banned' && (
                        <button onClick={() => handleAction(user.id, 'unban')}
                          className="p-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30" title="Unban">
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

      <div className="mt-4 flex justify-end gap-2">
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
          className="px-3 py-1 bg-[#2a2a2a] text-white rounded disabled:opacity-50">Previous</button>
        <span className="px-3 py-1 text-gray-400">Trang {page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
          className="px-3 py-1 bg-[#2a2a2a] text-white rounded disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
