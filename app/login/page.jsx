
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Check role to redirect
      if (data.user.role === 'admin' || data.user.role === 'moderator') {
        router.push('/admin');
      } else {
        router.push('/user/dashboard');
      }
      
      // Refresh router to update server components
      router.refresh();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-800">
        <h1 className="text-2xl font-bold text-yellow-500 mb-6 text-center">Đăng Nhập</h1>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-1 text-sm">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-yellow-500"
              placeholder="email@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-400 mb-1 text-sm">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-yellow-500"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="text-yellow-500 hover:underline">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
