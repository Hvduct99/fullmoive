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
      'SELECT t.id, t.user_id, u.username, t.amount, t.type, t.status, t.note, t.created_at, t.updated_at FROM transactions t JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC LIMIT 200'
    );

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Admin billing GET error:', error);
    return NextResponse.json({ message: 'Lỗi tải giao dịch', error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDatabaseSchema();

    const body = await request.json();
    const { transactionId, action } = body;

    if (!transactionId || !action) {
      return NextResponse.json({ message: 'Missing transactionId or action' }, { status: 400 });
    }

    const [rows] = await pool.query('SELECT user_id, amount, status FROM transactions WHERE id = ?', [transactionId]);
    if (rows.length === 0) {
      return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
    }

    const tx = rows[0];
    if (tx.status !== 'pending') {
      return NextResponse.json({ message: 'Transaction đã xử lý rồi' }, { status: 400 });
    }

    if (action === 'approve') {
      await pool.query('UPDATE transactions SET status = ? WHERE id = ?', ['completed', transactionId]);
      await pool.query('UPDATE users SET balance = COALESCE(balance,0) + ? WHERE id = ?', [tx.amount, tx.user_id]);

      // tự động nâng VIP nếu đủ 12k
      const [userRow] = await pool.query('SELECT role, balance FROM users WHERE id = ?', [tx.user_id]);
      const user = userRow[0] || {};
      if (user.balance >= 12000 && user.role !== 'admin') {
        const vipExpireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await pool.query('UPDATE users SET role = ?, vip_expire_at = ? WHERE id = ?', ['vip', vipExpireAt, tx.user_id]);
        await pool.query('INSERT INTO transactions (user_id, amount, type, status, note) VALUES (?, ?, ?, ?, ?)', [tx.user_id, 12000, 'vip_purchase', 'completed', 'Tự động cấp VIP khi nạp đủ 12000']);
        await pool.query('UPDATE users SET balance = balance - ? WHERE id = ?', [12000, tx.user_id]);
      }

      return NextResponse.json({ message: 'Đã duyệt giao dịch và cập nhật số dư' });
    }

    if (action === 'reject') {
      await pool.query('UPDATE transactions SET status = ? WHERE id = ?', ['rejected', transactionId]);
      return NextResponse.json({ message: 'Đã từ chối giao dịch' });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin billing PUT error:', error);
    return NextResponse.json({ message: 'Lỗi xử lý giao dịch', error: error.message }, { status: 500 });
  }
}
