
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(request) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'moderator')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const search = searchParams.get('search') || '';
  const offset = (page - 1) * limit;

  try {
    let query = 'SELECT id, username, email, role, status, created_at, vip_expire_at FROM users';
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    let params = [];

    if (search) {
      const searchCondition = ' WHERE username LIKE ? OR email LIKE ?';
      query += searchCondition;
      countQuery += searchCondition;
      params = [`%${search}%`, `%${search}%`];
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const queryParams = [...params, limit, offset];

    const [users] = await pool.query(query, queryParams);
    const [totalResult] = await pool.query(countQuery, params);

    return NextResponse.json({
      users,
      total: totalResult[0].total,
      page,
      totalPages: Math.ceil(totalResult[0].total / limit)
    });

  } catch (error) {
     console.error('Fetch users error:', error);
     return NextResponse.json({ message: 'Error fetching users' }, { status: 500 });
  }
}
