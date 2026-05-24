import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { ensureDatabaseSchema } from '@/lib/dbUtils';

export async function POST(request) {
  try {
    await ensureDatabaseSchema();
    const { username, email, phone, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { message: 'Vui lòng nhập đầy đủ tên đăng nhập, email và mật khẩu' },
        { status: 400 }
      );
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { message: 'Email hoặc tên đăng nhập đã tồn tại' },
        { status: 409 }
      );
    }

    const password_hash = await hashPassword(password);
    await pool.query(
      'INSERT INTO users (username, email, phone, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, phone ? phone.trim() : null, password_hash, 'member', 'active']
    );

    return NextResponse.json(
      { message: 'Đăng ký thành công! Vui lòng đăng nhập.', success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Lỗi máy chủ', error_detail: error.message, error_code: error.code || 'UNKNOWN' },
      { status: 500 }
    );
  }
}
