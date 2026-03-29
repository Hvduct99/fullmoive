import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema } from '@/lib/dbUtils';

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'moderator')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDatabaseSchema();
    const [transactions] = await pool.query(
      `SELECT t.id, t.user_id, u.username, t.amount, t.type, t.status, t.note, t.created_at
       FROM transactions t JOIN users u ON t.user_id = u.id
       ORDER BY t.created_at DESC LIMIT 200`
    );
    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Admin billing GET error:', error);
    return NextResponse.json({ message: 'Lỗi tải giao dịch' }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDatabaseSchema();
    const { transactionId, action } = await request.json();

    if (!transactionId || !action) {
      return NextResponse.json({ message: 'Missing transactionId or action' }, { status: 400 });
    }

    const [rows] = await pool.query('SELECT user_id, amount, status FROM transactions WHERE id = ?', [transactionId]);
    if (rows.length === 0) {
      return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
    }

    const tx = rows[0];
    if (tx.status !== 'pending') {
      return NextResponse.json({ message: 'Giao dịch đã được xử lý' }, { status: 400 });
    }

    if (action === 'approve') {
      await pool.query("UPDATE transactions SET status = 'completed' WHERE id = ?", [transactionId]);
      await pool.query('UPDATE users SET balance = COALESCE(balance,0) + ? WHERE id = ?', [tx.amount, tx.user_id]);
      return NextResponse.json({ message: `Đã duyệt và cộng ${tx.amount.toLocaleString()} đ vào tài khoản` });
    }

    if (action === 'reject') {
      await pool.query("UPDATE transactions SET status = 'rejected' WHERE id = ?", [transactionId]);
      return NextResponse.json({ message: 'Đã từ chối giao dịch' });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin billing PUT error:', error);
    return NextResponse.json({ message: 'Lỗi xử lý giao dịch' }, { status: 500 });
  }
}
