
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  
  if (!session || (session.role !== 'admin' && session.role !== 'moderator')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [movieCount] = await pool.query('SELECT COUNT(*) as count FROM movies');
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [viewCount] = await pool.query('SELECT SUM(view) as count FROM movies');
    const [recentUsers] = await pool.query('SELECT id, username, created_at FROM users ORDER BY created_at DESC LIMIT 5');
    // Simulated revenue (since we don't have completed transactions yet in detail)
    const [revenue] = await pool.query('SELECT SUM(amount) as total FROM transactions WHERE status = "completed"');

    return NextResponse.json({
      totalMovies: movieCount[0].count,
      totalUsers: userCount[0].count,
      totalViews: viewCount[0].count || 0,
      totalRevenue: revenue[0].total || 0,
      recentUsers
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ message: 'Error fetching stats' }, { status: 500 });
  }
}
