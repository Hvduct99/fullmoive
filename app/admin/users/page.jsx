
'use client';

import { useState, useEffect } from 'react';
import { Search, Shield, Ban, CheckCircle, MoreHorizontal } from 'lucide-react';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    setLoading(true);
    fetch(`/api/admin/users?page=${page}&search=${search}`)
      .then(res => res.json())
      .then(data => {
        setUsers(data.users);
        setTotalPages(data.totalPages);
        setLoading(false);
      });
  };

  useEffect(() => {
    const timeout = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timeout);
  }, [page, search]);

  const toggleStatus = async (userId, currentStatus) => {
      // Implement API call to toggle status
      alert('Functionality to connect to API update status');
  };

  return (
    <div>
       <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Quản lý Thành viên</h2>
        
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm user..." 
              className="bg-[#2a2a2a] text-white pl-10 pr-4 py-2 rounded-lg border border-[#333] focus:outline-none focus:border-yellow-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-lg border border-[#333] overflow-hidden">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="bg-[#252525] uppercase text-xs">
            <tr>
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">VIP Expiry</th>
              <th className="px-6 py-3">Joined</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan="6" className="text-center py-6">Loading...</td></tr>
            ) : users.map(user => (
              <tr key={user.id} className="border-b border-[#333] hover:bg-[#252525]">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center text-white font-bold">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-medium">{user.username}</div>
                    <div className="text-xs">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <span className={`px-2 py-1 rounded text-xs font-bold ${
                     user.role === 'admin' ? 'bg-red-900 text-red-200' :
                     user.role === 'vip' ? 'bg-yellow-900 text-yellow-200' :
                     'bg-gray-800 text-gray-200'
                   }`}>
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
                  {user.vip_expire_at ? new Date(user.vip_expire_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4">
                   {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <button className="text-gray-400 hover:text-white">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  );
}
