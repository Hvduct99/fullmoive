import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema } from '@/lib/dbUtils';

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await ensureDatabaseSchema();
    const { amount, note } = await request.json();
    const parsedAmount = Number(amount);

    if (!parsedAmount || parsedAmount < 1000) {
      return NextResponse.json({ message: 'Số tiền tối thiểu 1.000 đ' }, { status: 400 });
    }
    if (!note || !note.trim()) {
      return NextResponse.json({ message: 'Nội dung chuyển khoản bắt buộc (tên đăng nhập)' }, { status: 400 });
    }

    const [userRows] = await pool.query('SELECT username FROM users WHERE id = ?', [session.userId]);
    if (userRows.length === 0) return NextResponse.json({ message: 'User không tồn tại' }, { status: 404 });

    if (note.trim() !== userRows[0].username) {
      return NextResponse.json({ message: `Nội dung chuyển khoản phải đúng tên đăng nhập: "${userRows[0].username}"` }, { status: 400 });
    }

    await pool.query(
      'INSERT INTO transactions (user_id, amount, type, status, note) VALUES (?, ?, ?, ?, ?)',
      [session.userId, parsedAmount, 'deposit', 'pending', note.trim()]
    );

    return NextResponse.json({ message: 'Yêu cầu nạp tiền đã ghi nhận. Vui lòng chờ admin xác nhận.' });
  } catch (error) {
    console.error('Deposit error:', error);
    return NextResponse.json({ message: 'Lỗi ghi nhận nạp tiền' }, { status: 500 });
  }
}
