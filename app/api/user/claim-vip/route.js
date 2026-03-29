import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema } from '@/lib/dbUtils';

const VIP_PRICE = 12000;
const VIP_DAYS = 30;

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await ensureDatabaseSchema();

    const [userRows] = await pool.query('SELECT balance, role FROM users WHERE id = ?', [session.userId]);
    if (userRows.length === 0) return NextResponse.json({ message: 'User không tồn tại' }, { status: 404 });

    const user = userRows[0];
    if (user.role === 'vip') {
      return NextResponse.json({ message: 'Bạn đã là VIP rồi' }, { status: 400 });
    }
    if (user.balance < VIP_PRICE) {
      return NextResponse.json({ message: `Số dư chưa đủ. Cần tối thiểu ${VIP_PRICE.toLocaleString()} đ` }, { status: 400 });
    }

    const expireAt = new Date(Date.now() + VIP_DAYS * 24 * 60 * 60 * 1000);
    await pool.query(
      'UPDATE users SET balance = balance - ?, role = ?, vip_expire_at = ? WHERE id = ?',
      [VIP_PRICE, 'vip', expireAt, session.userId]
    );
    await pool.query(
      "INSERT INTO transactions (user_id, amount, type, status, note) VALUES (?, ?, 'vip_purchase', 'completed', ?)",
      [session.userId, VIP_PRICE, `Đăng ký VIP ${VIP_DAYS} ngày`]
    );

    return NextResponse.json({ message: `Đã kích hoạt VIP ${VIP_DAYS} ngày!` });
  } catch (error) {
    console.error('Claim VIP error:', error);
    return NextResponse.json({ message: 'Lỗi đăng ký VIP' }, { status: 500 });
  }
}
