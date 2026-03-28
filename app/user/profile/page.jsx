
'use client';

import { useState, useEffect } from 'react';
import { Crown, Clock, Shield } from 'lucide-react';

export default function UserProfile() {
  const [profile, setProfile] = useState({
      full_name: '',
      phone: '',
      email: '',
      username: '',
      role: 'member',
      isVip: false,
      vipExpired: false,
      vipExpireAt: null,
      membershipLabel: 'Thành viên thường'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/user/profile')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
            setProfile({
                full_name: data.user.full_name || '',
                phone: data.user.phone || '',
                email: data.user.email || '',
                username: data.user.username || '',
                role: data.user.role || 'member',
                isVip: Boolean(data.user.isVip),
                vipExpired: Boolean(data.user.vipExpired),
                vipExpireAt: data.user.vipExpireAt || null,
                membershipLabel: data.user.membershipLabel || 'Thành viên thường'
            });
        }
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e) => {
      e.preventDefault();
      setSaving(true);
      setMessage('');

      try {
          const res = await fetch('/api/user/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(profile)
          });
          
          if (res.ok) {
              setMessage('Cập nhật thành công!');
          } else {
              setMessage('Có lỗi xảy ra.');
          }
      } catch (err) {
          setMessage('Lỗi kết nối server.');
      } finally {
          setSaving(false);
      }
  };

  if (loading) return <div className="text-white">Loading...</div>;

  return (
    <div className="bg-[#1a1a1a] p-8 rounded-lg border border-[#333] max-w-2xl">
      <h2 className="text-2xl font-bold text-white mb-6">Hồ sơ cá nhân</h2>

            <div className={`mb-6 rounded-xl border p-5 ${profile.isVip ? 'border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-[#1a1a1a]' : 'border-[#333] bg-[#202020]'}`}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm text-gray-400 mb-1">Trạng thái thành viên</p>
                        <h3 className={`text-xl font-bold flex items-center gap-2 ${profile.isVip ? 'text-yellow-500' : 'text-white'}`}>
                            {profile.isVip ? <Crown size={20} /> : <Shield size={20} />}
                            {profile.membershipLabel}
                        </h3>
                        {profile.vipExpired && (
                            <p className="text-sm text-red-400 mt-2">Gói VIP đã hết hạn. Liên hệ admin để gia hạn.</p>
                        )}
                        {profile.isVip && profile.vipExpireAt && (
                            <p className="text-sm text-gray-400 mt-2 flex items-center gap-2">
                                <Clock size={14} /> Hết hạn: {new Date(profile.vipExpireAt).toLocaleDateString('vi-VN')}
                            </p>
                        )}
                        {profile.isVip && !profile.vipExpireAt && (
                            <p className="text-sm text-yellow-400 mt-2">Gói VIP vĩnh viễn.</p>
                        )}
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-bold ${profile.isVip ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-200'}`}>
                        {profile.role.toUpperCase()}
                    </div>
                </div>
            </div>
      
      {message && (
          <div className={`p-3 rounded mb-4 text-sm ${message.includes('lỗi') ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
              {message}
          </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-gray-400 mb-2 text-sm">Tên đăng nhập</label>
                <input
                    type="text"
                    value={profile.username}
                    disabled
                    className="w-full bg-[#252525] border border-[#333] rounded p-3 text-gray-500 cursor-not-allowed"
                />
            </div>
            <div>
                <label className="block text-gray-400 mb-2 text-sm">Email</label>
                <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full bg-[#252525] border border-[#333] rounded p-3 text-gray-500 cursor-not-allowed"
                />
            </div>
            
            <div>
                <label className="block text-gray-400 mb-2 text-sm">Họ và tên</label>
                <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                    className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Nhập họ tên đầy đủ"
                />
            </div>
            
            <div>
                <label className="block text-gray-400 mb-2 text-sm">Số điện thoại</label>
                <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-yellow-500"
                    placeholder="VD: 0987..."
                />
            </div>
        </div>

        <div className="pt-4 border-t border-[#333]">
            <button
                type="submit"
                disabled={saving}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded transition-colors disabled:opacity-50"
            >
                {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
        </div>
      </form>
    </div>
  );
}
