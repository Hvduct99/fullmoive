
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import pool from '@/lib/db';
import { getUserVipState } from '@/lib/vip';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  try {
    const [users] = await pool.query(
      'SELECT id, username, role, avatar, vip_expire_at FROM users WHERE id = ?',
      [session.userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ user: null });
    }

    const user = users[0];
    const vipState = getUserVipState(user);

    return NextResponse.json({ 
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        isVip: vipState.isVip,
        vipExpired: vipState.vipExpired,
        vipExpireAt: vipState.vipExpireAt,
        membershipLabel: vipState.membershipLabel
      } 
    });
  } catch (error) {
    return NextResponse.json({ 
      user: {
        id: session.userId,
        role: session.role
      } 
    });
  }
}
