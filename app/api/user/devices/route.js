import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema } from '@/lib/dbUtils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await ensureDatabaseSchema();
    const [rows] = await pool.query(
      'SELECT sid, user_agent, ip, created_at, last_seen FROM user_sessions WHERE user_id = ? ORDER BY last_seen DESC LIMIT 30',
      [session.userId]
    );
    const devices = rows.map((r) => ({
      id: r.sid,
      user_agent: r.user_agent,
      ip: r.ip,
      created_at: r.created_at,
      last_seen: r.last_seen,
      current: r.sid === session.sid,
    }));
    return NextResponse.json({ devices }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) {
    console.error('Devices GET error:', e);
    return NextResponse.json({ message: 'Lỗi tải thiết bị' }, { status: 500 });
  }
}

// ?id=<sid> đăng xuất 1 thiết bị | ?others=true đăng xuất mọi thiết bị khác
export async function DELETE(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await ensureDatabaseSchema();
    const { searchParams } = new URL(request.url);
    if (searchParams.get('others') === 'true') {
      await pool.query('DELETE FROM user_sessions WHERE user_id = ? AND sid <> ?', [session.userId, session.sid || '']);
      return NextResponse.json({ message: 'Đã đăng xuất các thiết bị khác' });
    }
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });
    if (id === session.sid) {
      return NextResponse.json({ message: 'Dùng nút Đăng xuất để thoát thiết bị hiện tại' }, { status: 400 });
    }
    await pool.query('DELETE FROM user_sessions WHERE sid = ? AND user_id = ?', [id, session.userId]);
    return NextResponse.json({ message: 'Đã đăng xuất thiết bị' });
  } catch (e) {
    console.error('Devices DELETE error:', e);
    return NextResponse.json({ message: 'Lỗi xử lý' }, { status: 500 });
  }
}
