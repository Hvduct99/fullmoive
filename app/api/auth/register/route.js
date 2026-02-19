
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/password';

export async function POST(request) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Check if user exists
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json({ message: 'User already exists' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert user with default role 'user'
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, 'user', 'active']
    );

    // In a real app, you might want to send a verification email here.
    // Also, consider logging this event securely.

    // Return success response with redirect hint if needed, though frontend handles routing
    return NextResponse.json({ 
        message: 'Đăng ký thành công! Vui lòng đăng nhập.', 
        success: true,
        userId: result.insertId 
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ 
      message: 'Internal server error', 
      error: error.message, // Return detailed error for debugging
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
