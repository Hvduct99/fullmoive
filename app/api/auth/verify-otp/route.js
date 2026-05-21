import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { consumePendingRegistration } from '@/lib/otp';

export async function POST(request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ message: 'Thiếu email hoặc mã xác nhận' }, { status: 400 });
    }

    const payload = await consumePendingRegistration({ email, code: String(code).trim() });
    if (!payload) {
      return NextResponse.json(
        { message: 'Mã xác nhận không hợp lệ hoặc đã hết hạn' },
        { status: 400 }
      );
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ? OR phone = ?',
      [payload.email, payload.username, payload.phone]
    );
    if (existing.length > 0) {
      return NextResponse.json({ message: 'Tài khoản đã tồn tại' }, { status: 409 });
    }

    await pool.query(
      'INSERT INTO users (username, email, phone, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [payload.username, payload.email, payload.phone, payload.password_hash, 'member', 'active']
    );

    return NextResponse.json(
      { message: 'Đăng ký thành công! Vui lòng đăng nhập.', success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { message: 'Lỗi máy chủ', error_detail: error.message },
      { status: 500 }
    );
  }
}
