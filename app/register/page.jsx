'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const initialForm = {
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submitInfo = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Đăng ký thất bại');
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
        <h1 className="text-2xl font-bold text-yellow-500 mb-6 text-center">
          Đăng Ký Thành Viên
        </h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submitInfo} className="space-y-4">
          <Field label="Tên đăng nhập" type="text" value={form.username} onChange={update('username')} />
          <Field label="Email" type="email" value={form.email} onChange={update('email')} />
          <Field label="Số điện thoại" type="tel" value={form.phone} onChange={update('phone')} />
          <Field label="Mật khẩu" type="password" value={form.password} onChange={update('password')} />
          <Field
            label="Nhập lại mật khẩu"
            type="password"
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
          />
          <SubmitButton loading={loading}>
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </SubmitButton>
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

function Field({ label, ...inputProps }) {
  return (
    <div>
      <label className="block text-gray-400 mb-1 text-sm">{label}</label>
      <input
        {...inputProps}
        required
        className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-yellow-500"
      />
    </div>
  );
}

function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded transition-colors disabled:opacity-50"
    >
      {children}
    </button>
  );
}
