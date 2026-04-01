'use client';

import { useState, useEffect } from 'react';
import { Search, Ban, CheckCircle, X, UserCheck, Pencil, Trash2, Plus, Eye, Save, KeyRound } from 'lucide-react';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Modal states
  const [modal, setModal] = useState(null); // 'create' | 'edit' | 'view' | null
  const [modalUser, setModalUser] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Form data for create/edit
  const [form, setForm] = useState({
    username: '', email: '', password: '', role: 'member',
    full_name: '', phone: '', status: 'active', balance: 0, new_password: '',
  });

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchUsers = () => {
    setLoading(true);
    let url = `/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`;
    if (roleFilter) url += `&role=${roleFilter}`;
    if (statusFilter) url += `&status=${statusFilter}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    const timeout = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timeout);
  }, [page, search, roleFilter, statusFilter]);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  // Open create modal
  const openCreate = () => {
    setForm({ username: '', email: '', password: '', role: 'member', full_name: '', phone: '', status: 'active', balance: 0, new_password: '' });
    setModal('create');
  };

  // Open view modal
  const openView = async (userId) => {
    setModalLoading(true);
    setModal('view');
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`);
      const data = await res.json();
      setModalUser(data.user);
    } catch { showMsg('Lỗi tải thông tin user', 'error'); setModal(null); }
    finally { setModalLoading(false); }
  };

  // Open edit modal
  const openEdit = async (userId) => {
    setModalLoading(true);
    setModal('edit');
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`);
      const data = await res.json();
      const u = data.user;
      setModalUser(u);
      setForm({
        username: u.username || '', email: u.email || '', password: '',
        role: u.role || 'member', full_name: u.full_name || '', phone: u.phone || '',
        status: u.status || 'active', balance: u.balance || 0, new_password: '',
      });
    } catch { showMsg('Lỗi tải thông tin user', 'error'); setModal(null); }
    finally { setModalLoading(false); }
  };

  // Create user
  const handleCreate = async () => {
    if (!form.username.trim() || !form.email.trim() || !form.password) {
      showMsg('Vui lòng điền username, email và mật khẩu', 'error'); return;
    }
    setModalLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) { showMsg(data.message); setModal(null); fetchUsers(); }
      else showMsg(data.message, 'error');
    } catch { showMsg('Lỗi kết nối', 'error'); }
    finally { setModalLoading(false); }
  };

  // Edit user
  const handleEdit = async () => {
    setModalLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: modalUser.id, action: 'edit', ...form })
      });
      const data = await res.json();
      if (res.ok) { showMsg(data.message); setModal(null); fetchUsers(); }
      else showMsg(data.message, 'error');
    } catch { showMsg('Lỗi kết nối', 'error'); }
    finally { setModalLoading(false); }
  };

  // Quick action (ban/unban)
  const handleQuickAction = async (userId, action) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action })
      });
      const data = await res.json();
      showMsg(data.message, res.ok ? 'success' : 'error');
      if (res.ok) fetchUsers();
    } catch { showMsg('Lỗi kết nối', 'error'); }
  };

  // Delete user
  const handleDelete = async (userId) => {
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      showMsg(data.message, res.ok ? 'success' : 'error');
      if (res.ok) fetchUsers();
    } catch { showMsg('Lỗi kết nối', 'error'); }
    finally { setDeleteConfirm(null); }
  };

  const closeModal = () => { setModal(null); setModalUser(null); };

  const roleColor = (r) => r === 'admin' ? 'bg-red-900 text-red-200' : r === 'moderator' ? 'bg-blue-900 text-blue-200' : 'bg-gray-800 text-gray-200';

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Quản lý Thành viên</h2>
          <p className="text-sm text-gray-500 mt-1">Tổng cộng: {total} user</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors">
            <Plus size={16} /> Tạo User
          </button>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="bg-[#2a2a2a] text-white px-3 py-2 rounded-lg border border-[#333] text-sm">
            <option value="">Tất cả role</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="member">Member</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-[#2a2a2a] text-white px-3 py-2 rounded-lg border border-[#333] text-sm">
            <option value="">Tất cả status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Tìm username, email, tên, SĐT..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="bg-[#2a2a2a] text-white pl-9 pr-4 py-2 rounded-lg border border-[#333] text-sm w-[260px]" />
          </div>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-lg text-sm flex items-center justify-between ${message.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage({ text: '', type: '' })}><X size={14} /></button>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#1a1a1a] rounded-lg border border-[#333] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-[#252525] uppercase text-xs">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">SĐT</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Số dư</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="text-center py-6">Đang tải...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-6 text-gray-500">Không tìm thấy user nào</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="border-b border-[#333] hover:bg-[#252525]">
                  <td className="px-4 py-3 text-gray-500">{user.id}</td>
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
                  <td className="px-4 py-3 text-gray-300">{user.full_name || <span className="text-gray-600">-</span>}</td>
                  <td className="px-4 py-3">{user.phone || <span className="text-gray-600">-</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${roleColor(user.role)}`}>{user.role.toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-3">
                    {user.status === 'banned'
                      ? <span className="flex items-center text-red-500 gap-1"><Ban size={14} /> Banned</span>
                      : <span className="flex items-center text-green-500 gap-1"><CheckCircle size={14} /> Active</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white font-semibold">{Number(user.balance || 0).toLocaleString()} đ</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(user.created_at).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openView(user.id)} className="p-1.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" title="Xem chi tiết">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => openEdit(user.id)} className="p-1.5 rounded bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30" title="Chỉnh sửa">
                        <Pencil size={14} />
                      </button>
                      {user.role !== 'admin' && user.status !== 'banned' && (
                        <button onClick={() => handleQuickAction(user.id, 'ban')} className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30" title="Ban">
                          <Ban size={14} />
                        </button>
                      )}
                      {user.status === 'banned' && (
                        <button onClick={() => handleQuickAction(user.id, 'unban')} className="p-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30" title="Unban">
                          <UserCheck size={14} />
                        </button>
                      )}
                      {user.role !== 'admin' && (
                        <button onClick={() => setDeleteConfirm(user)} className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30" title="Xóa">
                          <Trash2 size={14} />
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
      <div className="mt-4 flex justify-between items-center">
        <span className="text-sm text-gray-500">Hiển thị {users.length} / {total} user</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 bg-[#2a2a2a] text-white rounded text-sm disabled:opacity-50">Previous</button>
          <span className="px-3 py-1.5 text-gray-400 text-sm">Trang {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 bg-[#2a2a2a] text-white rounded text-sm disabled:opacity-50">Next</button>
        </div>
      </div>

      {/* ===== VIEW MODAL ===== */}
      {modal === 'view' && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Chi tiết User</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            {modalLoading ? <p className="text-gray-400">Đang tải...</p> : modalUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-[#333]">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold bg-[#333] text-white">
                    {(modalUser.username || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">{modalUser.username}</h4>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${roleColor(modalUser.role)}`}>{modalUser.role.toUpperCase()}</span>
                    <span className={`ml-2 text-xs ${modalUser.status === 'banned' ? 'text-red-400' : 'text-green-400'}`}>
                      {modalUser.status === 'banned' ? 'Banned' : 'Active'}
                    </span>
                  </div>
                </div>
                {[
                  ['ID', modalUser.id],
                  ['Email', modalUser.email],
                  ['Họ tên', modalUser.full_name || '-'],
                  ['SĐT', modalUser.phone || '-'],
                  ['Số dư', `${Number(modalUser.balance || 0).toLocaleString()} đ`],
                  ['Ngày tạo', new Date(modalUser.created_at).toLocaleString('vi-VN')],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between py-2 border-b border-[#292929]">
                    <span className="text-gray-500 text-sm">{label}</span>
                    <span className="text-white text-sm font-medium">{val}</span>
                  </div>
                ))}
                <div className="pt-4 flex gap-3">
                  <button onClick={() => { closeModal(); openEdit(modalUser.id); }}
                    className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2.5 rounded-lg text-sm">
                    <Pencil size={14} /> Chỉnh sửa
                  </button>
                  <button onClick={closeModal}
                    className="flex-1 py-2.5 bg-[#333] text-gray-300 rounded-lg hover:bg-[#444] text-sm">Đóng</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== CREATE / EDIT MODAL ===== */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                {modal === 'create' ? 'Tạo User mới' : `Chỉnh sửa: ${modalUser?.username}`}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              {/* Username & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">Username *</label>
                  <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                    className="w-full bg-[#252525] border border-[#444] rounded-lg p-2.5 text-white text-sm focus:border-yellow-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-[#252525] border border-[#444] rounded-lg p-2.5 text-white text-sm focus:border-yellow-500 focus:outline-none" />
                </div>
              </div>

              {/* Full name & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">Họ và tên</label>
                  <input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                    className="w-full bg-[#252525] border border-[#444] rounded-lg p-2.5 text-white text-sm focus:border-yellow-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">Số điện thoại</label>
                  <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-[#252525] border border-[#444] rounded-lg p-2.5 text-white text-sm focus:border-yellow-500 focus:outline-none" />
                </div>
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">Role</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full bg-[#252525] border border-[#444] rounded-lg p-2.5 text-white text-sm focus:border-yellow-500 focus:outline-none">
                    <option value="member">Member</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {modal === 'edit' && (
                  <div>
                    <label className="block text-gray-400 text-xs mb-1.5">Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full bg-[#252525] border border-[#444] rounded-lg p-2.5 text-white text-sm focus:border-yellow-500 focus:outline-none">
                      <option value="active">Active</option>
                      <option value="banned">Banned</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Balance (edit only) */}
              {modal === 'edit' && (
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">Số dư (VNĐ)</label>
                  <input type="number" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })}
                    className="w-full bg-[#252525] border border-[#444] rounded-lg p-2.5 text-white text-sm focus:border-yellow-500 focus:outline-none" />
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-gray-400 text-xs mb-1.5 flex items-center gap-1">
                  <KeyRound size={12} />
                  {modal === 'create' ? 'Mật khẩu *' : 'Đặt lại mật khẩu (để trống nếu không đổi)'}
                </label>
                <input type="password"
                  value={modal === 'create' ? form.password : form.new_password}
                  onChange={e => setForm({ ...form, [modal === 'create' ? 'password' : 'new_password']: e.target.value })}
                  placeholder={modal === 'create' ? 'Tối thiểu 6 ký tự' : 'Nhập mật khẩu mới...'}
                  className="w-full bg-[#252525] border border-[#444] rounded-lg p-2.5 text-white text-sm focus:border-yellow-500 focus:outline-none" />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-[#333] flex gap-3">
                <button onClick={modal === 'create' ? handleCreate : handleEdit} disabled={modalLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2.5 rounded-lg text-sm disabled:opacity-50">
                  {modalLoading ? 'Đang xử lý...' : (
                    <>{modal === 'create' ? <Plus size={14} /> : <Save size={14} />} {modal === 'create' ? 'Tạo User' : 'Lưu thay đổi'}</>
                  )}
                </button>
                <button onClick={closeModal} className="px-6 py-2.5 bg-[#333] text-gray-300 rounded-lg hover:bg-[#444] text-sm">Hủy</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRM MODAL ===== */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-[#1a1a1a] border border-red-500/30 rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
              <Trash2 size={20} /> Xác nhận xóa User
            </h3>
            <p className="text-gray-400 text-sm mb-2">
              Bạn có chắc muốn xóa user <strong className="text-white">{deleteConfirm.username}</strong> ({deleteConfirm.email})?
            </p>
            <p className="text-red-400 text-xs mb-6">
              Hành động này sẽ xóa vĩnh viễn tài khoản, bình luận, và giao dịch của user. Không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-sm">
                Xóa vĩnh viễn
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-[#333] text-gray-300 rounded-lg hover:bg-[#444] text-sm">Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
