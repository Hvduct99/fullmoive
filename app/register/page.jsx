
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: formData.username,
          email: formData.email, 
          password: formData.password
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Show detailed error if available
        throw new Error(data.error_detail ? `${data.message}: ${data.error_detail}` : (data.message || 'Đăng ký thất bại'));
      }

      router.push('/login?registered=true');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-800">
        <h1 className="text-2xl font-bold text-yellow-500 mb-6 text-center">Đăng Ký Thành Viên</h1>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-1 text-sm">Tên đăng nhập</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-yellow-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1 text-sm">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-yellow-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-400 mb-1 text-sm">Mật khẩu</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-yellow-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1 text-sm">Nhập lại mật khẩu</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-yellow-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : 'Đăng Ký'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-yellow-500 hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
