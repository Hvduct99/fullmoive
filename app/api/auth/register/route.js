import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { ensureDatabaseSchema } from '@/lib/dbUtils';
import { generateOtp, storePendingRegistration } from '@/lib/otp';
import { sendVerificationEmail } from '@/lib/mailer';

const PHONE_REGEX = /^[0-9+\-\s()]{8,20}$/;

export async function POST(request) {
  try {
    await ensureDatabaseSchema();
    const { username, email, phone, password } = await request.json();

    if (!username || !email || !phone || !password) {
      return NextResponse.json(
        { message: 'Vui lòng nhập đầy đủ thông tin (gồm cả số điện thoại)' },
        { status: 400 }
      );
    }
    if (!PHONE_REGEX.test(phone.trim())) {
      return NextResponse.json({ message: 'Số điện thoại không hợp lệ' }, { status: 400 });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ? OR phone = ?',
      [email, username, phone.trim()]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { message: 'Email, tên đăng nhập hoặc số điện thoại đã tồn tại' },
        { status: 409 }
      );
    }

    const password_hash = await hashPassword(password);
    const code = generateOtp();

    await storePendingRegistration({
      email,
      code,
      payload: { username, email, phone: phone.trim(), password_hash },
    });
    await sendVerificationEmail({ to: email, code });

    return NextResponse.json(
      { message: 'Đã gửi mã xác nhận đến email', success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Lỗi máy chủ', error_detail: error.message, error_code: error.code || 'UNKNOWN' },
      { status: 500 }
    );
  }
}
