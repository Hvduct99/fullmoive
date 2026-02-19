
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [users] = await pool.query(
      'SELECT id, username, email, full_name, phone, avatar, role, vip_expire_at, created_at FROM users WHERE id = ?',
      [session.userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Get watch stats
    const [watchStats] = await pool.query(
       'SELECT COUNT(*) as count FROM watch_history WHERE user_id = ?',
       [session.userId]
    );

    return NextResponse.json({
      user: users[0],
      stats: {
        watchedMovies: watchStats[0].count
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
    const { full_name, phone, avatar } = body; // Simplified for now
    
    await pool.query(
      'UPDATE users SET full_name = ?, phone = ?, avatar = ? WHERE id = ?',
      [full_name, phone, avatar, session.userId]
    );

    return NextResponse.json({ message: 'Profile updated' });
  } catch (error) {
     return NextResponse.json({ message: 'Update failed' }, { status: 500 });
  }
}
