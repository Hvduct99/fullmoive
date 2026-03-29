import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema } from '@/lib/dbUtils';

const VIP_PRICE = 12000;
const VIP_DAYS = 30;

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDatabaseSchema();

    const [userRows] = await pool.query('SELECT balance, role, vip_expire_at FROM users WHERE id = ?', [session.userId]);
    if (userRows.length === 0) {
      return NextResponse.json({ message: 'User không tồn tại' }, { status: 404 });
    }

    const user = userRows[0];
    if (user.balance < VIP_PRICE) {
      return NextResponse.json({ message: `Số dư chưa đủ, cần tối thiểu ${VIP_PRICE} đ để đăng ký VIP` }, { status: 400 });
    }

    const newBalance = user.balance - VIP_PRICE;
    const newExpireAt = new Date(Date.now() + VIP_DAYS * 24 * 60 * 60 * 1000);

    await pool.query('UPDATE users SET balance = ?, role = ?, vip_expire_at = ? WHERE id = ?', [newBalance, 'vip', newExpireAt, session.userId]);
    await pool.query(
      'INSERT INTO transactions (user_id, amount, type, status, note) VALUES (?, ?, ?, ?, ?)',
      [session.userId, VIP_PRICE, 'vip_purchase', 'completed', 'Mua VIP tự động']
    );

    return NextResponse.json({ message: `Đã kích hoạt VIP ${VIP_DAYS} ngày. Số dư còn lại ${newBalance} đ` });
  } catch (error) {
    console.error('Claim VIP error:', error);
    return NextResponse.json({ message: 'Lỗi đặt VIP', error: error.message }, { status: 500 });
  }
}
