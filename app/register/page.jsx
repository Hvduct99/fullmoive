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
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [code, setCode] = useState('');
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
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Xác nhận thất bại');
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

        {step === 1 ? (
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
              {loading ? 'Đang gửi mã...' : 'Gửi mã xác nhận'}
            </SubmitButton>
          </form>
        ) : (
          <form onSubmit={submitCode} className="space-y-4">
            <p className="text-sm text-gray-400">
              Mã xác nhận đã được gửi đến{' '}
              <span className="text-white">{form.email}</span>. Mã có hiệu lực 10 phút.
            </p>
            <Field
              label="Mã xác nhận (6 chữ số)"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            <SubmitButton loading={loading}>
              {loading ? 'Đang xác nhận...' : 'Xác nhận đăng ký'}
            </SubmitButton>
            <button
              type="button"
              onClick={() => {
                setError('');
                setCode('');
                setStep(1);
              }}
              className="block w-full text-sm text-gray-400 hover:text-yellow-400"
            >
              Quay lại sửa thông tin
            </button>
          </form>
        )}

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
