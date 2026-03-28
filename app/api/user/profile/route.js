
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { getUserVipState } from '@/lib/vip';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [session.userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    // Get watch stats safely (table may not exist)
    let watchedCount = 0;
    try {
      const [watchStats] = await pool.query(
        'SELECT COUNT(*) as count FROM watch_history WHERE user_id = ?',
        [session.userId]
      );
      watchedCount = watchStats[0].count;
    } catch (e) {}

    const vipState = getUserVipState(user);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username || '',
        email: user.email || '',
        full_name: user.full_name || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
        role: user.role || 'user',
        created_at: user.created_at,
        isVip: vipState.isVip,
        vipExpired: vipState.vipExpired,
        vipExpireAt: vipState.vipExpireAt,
        membershipLabel: vipState.membershipLabel,
      },
      stats: {
        watchedMovies: watchedCount
      }
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
    return NextResponse.json({ message: 'Error fetching profile' }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { full_name, phone, avatar } = body;

    // Update only columns that exist in the table
    try {
      await pool.query(
        'UPDATE users SET full_name = ?, phone = ?, avatar = ? WHERE id = ?',
        [full_name || null, phone || null, avatar || null, session.userId]
      );
    } catch (e) {
      // If columns don't exist, try basic update
      await pool.query(
        'UPDATE users SET avatar = ? WHERE id = ?',
        [avatar || null, session.userId]
      );
    }

    return NextResponse.json({ message: 'Profile updated' });
  } catch (error) {
     return NextResponse.json({ message: 'Update failed' }, { status: 500 });
  }
}
