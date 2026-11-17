import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema } from '@/lib/dbUtils';
import { getUserById, publicUser } from '@/lib/wallet';

export const dynamic = 'force-dynamic';

// Đổi hệ phái
export async function PUT(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await ensureDatabaseSchema();
    const { faction } = await request.json();
    if (!['boiz', 'girlz'].includes(faction)) {
      return NextResponse.json({ message: 'Hệ phái không hợp lệ' }, { status: 400 });
    }
    await pool.query('UPDATE users SET faction = ? WHERE id = ?', [faction, session.userId]);
    const user = await getUserById(session.userId);
    return NextResponse.json({ message: 'Đã đổi hệ phái!', user: publicUser(user) });
  } catch (e) {
    console.error('Settings PUT error:', e);
    return NextResponse.json({ message: 'Lỗi cập nhật' }, { status: 500 });
  }
}
