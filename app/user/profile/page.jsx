'use client';

import { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Save, Trash2, Lock, User, Mail, Phone, UserCircle, AlertTriangle } from 'lucide-react';

export default function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [editData, setEditData] = useState({
    username: '',
    email: '',
    full_name: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Password change state
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwMessage, setPwMessage] = useState({ text: '', type: '' });

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('info');

  // READ - Fetch profile
  useEffect(() => {
    fetch('/api/user/profile')
      .then(res => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then(data => {
        if (data.user) {
          setProfile(data.user);
          setEditData({
            username: data.user.username || '',
            email: data.user.email || '',
            full_name: data.user.full_name || '',
            phone: data.user.phone || '',
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // UPDATE - Save profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    if (!editData.username.trim()) {
      setMessage({ text: 'Tên đăng nhập không được để trống', type: 'error' });
      setSaving(false);
      return;
    }
    if (!editData.email.trim()) {
      setMessage({ text: 'Email không được để trống', type: 'error' });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ text: data.message, type: 'success' });
        setProfile(prev => ({ ...prev, ...editData }));
      } else {
        setMessage({ text: data.message, type: 'error' });
      }
    } catch {
      setMessage({ text: 'Lỗi kết nối server', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // UPDATE - Change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMessage({ text: '', type: '' });

    if (!passwords.current_password || !passwords.new_password || !passwords.confirm_password) {
      setPwMessage({ text: 'Vui lòng điền đầy đủ thông tin', type: 'error' });
      return;
    }
    if (passwords.new_password.length < 6) {
      setPwMessage({ text: 'Mật khẩu mới phải có ít nhất 6 ký tự', type: 'error' });
      return;
    }
    if (passwords.new_password !== passwords.confirm_password) {
      setPwMessage({ text: 'Mật khẩu xác nhận không khớp', type: 'error' });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          current_password: passwords.current_password,
          new_password: passwords.new_password,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setPwMessage({ text: data.message, type: 'success' });
        setPasswords({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        setPwMessage({ text: data.message, type: 'error' });
      }
    } catch {
      setPwMessage({ text: 'Lỗi kết nối server', type: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  // DELETE - Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'XOA TAI KHOAN') return;

    setDeleting(true);
    try {
      const res = await fetch('/api/user/profile', { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        window.location.href = '/login';
      } else {
        alert(data.message);
      }
    } catch {
      alert('Lỗi kết nối server');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="text-white p-8">Đang tải...</div>;

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">Không thể tải thông tin tài khoản.</p>
        <a href="/login" className="text-yellow-500 hover:underline">Đăng nhập lại</a>
      </div>
    );
  }

  const tabs = [
    { id: 'info', label: 'Thông tin cá nhân', icon: <UserCircle size={16} /> },
    { id: 'password', label: 'Đổi mật khẩu', icon: <Lock size={16} /> },
    { id: 'danger', label: 'Xóa tài khoản', icon: <Trash2 size={16} /> },
  ];

  const isAdmin = profile.role === 'admin' || profile.role === 'moderator';

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-600/30 via-purple-600/20 to-blue-600/10" />
        <div className="px-6 pb-6 -mt-10 flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-4 border-[#1a1a1a] bg-gray-700 text-white">
            {(profile.username || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{profile.username}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-gray-700 text-gray-400">
                <Shield size={10} className="inline mr-1" />
                {isAdmin ? 'Quản trị viên' : 'Thành viên'}
              </span>
              <span className="text-xs text-gray-400">Số dư: <strong className="text-white">{Number(profile.balance || 0).toLocaleString()} đ</strong></span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Tham gia: {profile.created_at ? new Date(profile.created_at).toLocaleDateString('vi-VN') : 'N/A'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1a1a1a] rounded-xl p-1 border border-[#333]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? tab.id === 'danger' ? 'bg-red-500/20 text-red-400' : 'bg-[#333] text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#252525]'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <UserCircle size={20} className="text-blue-400" /> Thông tin cá nhân
          </h3>

          {message.text && (
            <div className={`p-3 rounded-lg mb-4 text-sm ${message.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="flex items-center gap-1.5 text-gray-400 mb-2 text-sm">
                  <User size={14} /> Tên đăng nhập
                </label>
                <input
                  type="text"
                  value={editData.username}
                  onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                  placeholder="Tên đăng nhập"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-gray-400 mb-2 text-sm">
                  <Mail size={14} /> Email
                </label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-gray-400 mb-2 text-sm">
                  <UserCircle size={14} /> Họ và tên
                </label>
                <input
                  type="text"
                  value={editData.full_name}
                  onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                  placeholder="Nhập họ tên đầy đủ"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-gray-400 mb-2 text-sm">
                  <Phone size={14} /> Số điện thoại
                </label>
                <input
                  type="text"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                  placeholder="VD: 0987..."
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#333] flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button
                type="button"
                onClick={() => setEditData({
                  username: profile.username || '',
                  email: profile.email || '',
                  full_name: profile.full_name || '',
                  phone: profile.phone || '',
                })}
                className="px-6 py-2.5 text-sm text-gray-400 hover:text-white border border-[#333] rounded-lg hover:border-gray-500 transition-colors"
              >
                Hủy thay đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Lock size={20} className="text-yellow-500" /> Đổi mật khẩu
          </h3>

          {pwMessage.text && (
            <div className={`p-3 rounded-lg mb-4 text-sm ${pwMessage.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {pwMessage.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-5 max-w-md">
            <div>
              <label className="block text-gray-400 mb-2 text-sm">Mật khẩu hiện tại</label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwords.current_password}
                  onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg p-3 pr-10 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                  placeholder="Nhập mật khẩu hiện tại"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 mb-2 text-sm">Mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwords.new_password}
                  onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg p-3 pr-10 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                  placeholder="Ít nhất 6 ký tự"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 mb-2 text-sm">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwords.confirm_password}
                  onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg p-3 pr-10 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                  placeholder="Nhập lại mật khẩu mới"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              <Lock size={16} /> {changingPassword ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'danger' && (
        <div className="bg-[#1a1a1a] rounded-xl border border-red-500/30 p-6">
          <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
            <AlertTriangle size={20} /> Vùng nguy hiểm
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            Xóa tài khoản sẽ xóa vĩnh viễn toàn bộ dữ liệu của bạn bao gồm lịch sử xem, danh sách yêu thích, và thông tin cá nhân. Hành động này không thể hoàn tác.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium py-2.5 px-6 rounded-lg border border-red-500/30 transition-colors"
            >
              <Trash2 size={16} /> Xóa tài khoản
            </button>
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-4">
              <p className="text-sm text-red-300">
                Để xác nhận, hãy nhập <strong className="text-white">XOA TAI KHOAN</strong> vào ô bên dưới:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full bg-[#2a2a2a] border border-red-500/30 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                placeholder="Nhập XOA TAI KHOAN để xác nhận"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'XOA TAI KHOAN' || deleting}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 size={16} /> {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  className="px-6 py-2.5 text-sm text-gray-400 hover:text-white border border-[#333] rounded-lg hover:border-gray-500 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
