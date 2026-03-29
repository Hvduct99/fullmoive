import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema } from '@/lib/dbUtils';

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'moderator')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDatabaseSchema();

    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [vipCount] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'vip'");
    const [recentUsers] = await pool.query(
      'SELECT id, username, role, status, created_at FROM users ORDER BY created_at DESC LIMIT 5'
    );
    const [revenue] = await pool.query(
      "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type = 'vip_purchase' AND status = 'completed'"
    );
    const [pendingCount] = await pool.query(
      "SELECT COUNT(*) as count FROM transactions WHERE status = 'pending'"
    );
    const [totalBalance] = await pool.query('SELECT COALESCE(SUM(balance),0) as total FROM users');

    return NextResponse.json({
      totalUsers: userCount[0].count,
      totalVipUsers: vipCount[0].count,
      totalRevenue: revenue[0].total,
      totalBalance: totalBalance[0].total,
      pendingTransactions: pendingCount[0].count,
      recentUsers
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ message: 'Error fetching stats' }, { status: 500 });
  }
}
