
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
  const roleFilter = searchParams.get('role') || '';
  const offset = (page - 1) * limit;

  try {
    let query = 'SELECT id, username, email, role, status, created_at, vip_expire_at FROM users';
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    let conditions = [];
    let params = [];

    if (search) {
      conditions.push('(username LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (roleFilter) {
      conditions.push('role = ?');
      params.push(roleFilter);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
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

// PUT: Cập nhật role/VIP cho user (Admin only)
export async function PUT(request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId, action, vipDays } = await request.json();

    if (!userId || !action) {
      return NextResponse.json({ message: 'Missing userId or action' }, { status: 400 });
    }

    // Không cho phép thay đổi chính mình
    if (userId === session.userId) {
      return NextResponse.json({ message: 'Không thể thay đổi tài khoản của chính mình' }, { status: 400 });
    }

    if (action === 'grant_vip') {
      const days = parseInt(vipDays) || 30;
      const expireAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      await pool.query(
        'UPDATE users SET role = ?, vip_expire_at = ? WHERE id = ?',
        ['vip', expireAt, userId]
      );
      return NextResponse.json({ message: `Đã cấp VIP ${days} ngày thành công` });
    }

    if (action === 'revoke_vip') {
      await pool.query(
        'UPDATE users SET role = ?, vip_expire_at = NULL WHERE id = ?',
        ['member', userId]
      );
      return NextResponse.json({ message: 'Đã thu hồi VIP thành công' });
    }

    if (action === 'ban') {
      await pool.query('UPDATE users SET status = ? WHERE id = ?', ['banned', userId]);
      return NextResponse.json({ message: 'Đã ban user' });
    }

    if (action === 'unban') {
      await pool.query('UPDATE users SET status = ? WHERE id = ?', ['active', userId]);
      return NextResponse.json({ message: 'Đã unban user' });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ message: 'Error updating user' }, { status: 500 });
  }
}
