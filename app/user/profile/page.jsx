
'use client';

import { useState, useEffect } from 'react';

export default function UserProfile() {
  const [profile, setProfile] = useState({
      full_name: '',
      phone: '',
      email: '',
      username: ''
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
                username: data.user.username || ''
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
