import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema } from '@/lib/dbUtils';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await ensureDatabaseSchema();
    const [transactions] = await pool.query(
      'SELECT id, amount, type, status, note, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [session.userId]
    );
    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('User transactions error:', error);
    return NextResponse.json({ message: 'Lỗi lấy giao dịch' }, { status: 500 });
  }
}
