import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema } from '@/lib/dbUtils';

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDatabaseSchema();

    const body = await request.json();
    let { amount, note } = body;
    amount = Number(amount || 0);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ message: 'Vui lòng nhập số tiền hợp lệ lớn hơn 0' }, { status: 400 });
    }
    if (!note || note.trim() === '') {
      return NextResponse.json({ message: 'Nội dung chuyển khoản bắt buộc (tên đăng nhập)' }, { status: 400 });
    }

    const [userRows] = await pool.query('SELECT username FROM users WHERE id = ?', [session.userId]);
    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User không tồn tại' }, { status: 404 });
    }

    const username = userRows[0].username;
    if (note.trim() !== username) {
      return NextResponse.json({ message: 'Nội dung chuyển khoản phải đúng tên đăng nhập của bạn' }, { status: 400 });
    }

    const [result] = await pool.query(
      'INSERT INTO transactions (user_id, amount, type, status, note) VALUES (?, ?, ?, ?, ?)',
      [session.userId, amount, 'deposit', 'pending', note.trim()]
    );

    return NextResponse.json({ message: 'Yêu cầu nạp tiền đã được ghi nhận. Vui lòng chờ admin xác nhận.', transactionId: result.insertId });
  } catch (error) {
    console.error('Deposit error:', error);
    return NextResponse.json({ message: 'Lỗi khi ghi nhận nạp tiền', error: error.message }, { status: 500 });
  }
}
