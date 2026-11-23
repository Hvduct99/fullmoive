import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { getPartyByCode } from '@/lib/watchParty';

export const dynamic = 'force-dynamic';

const SECRET = new TextEncoder().encode(process.env.SOCKET_SECRET || process.env.SESSION_SECRET || 'changethissecret12345');

/**
 * Cấp token ngắn hạn để kết nối Socket.IO server (khác domain/port nên không dùng cookie được).
 * Chỉ thành viên của phòng (đang mở) mới nhận được token.
 */
export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const party = await getPartyByCode(params.code);
    if (!party) return NextResponse.json({ message: 'Phòng không tồn tại' }, { status: 404 });
    if (party.status !== 'open') return NextResponse.json({ message: 'Phòng đã đóng' }, { status: 400 });

    const [m] = await pool.query('SELECT 1 FROM watch_party_members WHERE party_id = ? AND user_id = ?', [party.id, session.userId]);
    if (!m.length) return NextResponse.json({ message: 'Vào phòng trước đã' }, { status: 403 });

    const [u] = await pool.query('SELECT username, faction FROM users WHERE id = ?', [session.userId]);
    const token = await new SignJWT({
      uid: session.userId,
      name: u[0]?.username || 'user',
      faction: u[0]?.faction || 'boiz',
      room: party.code,
      host: party.host_id === session.userId,
      hostId: party.host_id,
      ep: party.episode_slug || null,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience('watch-party')
      .setIssuedAt()
      .setExpirationTime('6h')
      .sign(SECRET);

    return NextResponse.json(
      { token, url: process.env.NEXT_PUBLIC_SOCKET_URL || null },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    console.error('Socket token error:', e);
    return NextResponse.json({ message: 'Lỗi cấp token' }, { status: 500 });
  }
}
