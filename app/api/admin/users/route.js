import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema } from '@/lib/dbUtils';
import { hashPassword } from '@/lib/password';

export async function GET(request) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'moderator')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  // Single user detail
  const userId = searchParams.get('id');
  if (userId) {
    try {
      await ensureDatabaseSchema();
      const [users] = await pool.query(
        `SELECT id, username, email, full_name, phone, avatar, role, COALESCE(status,'active') as status, created_at, COALESCE(balance,0) as balance FROM users WHERE id = ?`,
        [userId]
      );
      if (users.length === 0) return NextResponse.json({ message: 'User not found' }, { status: 404 });
      return NextResponse.json({ user: users[0] });
    } catch (error) {
      console.error('Fetch user detail error:', error);
      return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
  }

  // List users with pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const search = searchParams.get('search') || '';
  const roleFilter = searchParams.get('role') || '';
  const statusFilter = searchParams.get('status') || '';
  const offset = (page - 1) * limit;

  try {
    await ensureDatabaseSchema();

    let conditions = [];
    let params = [];

    if (search) {
      conditions.push('(username LIKE ? OR email LIKE ? OR full_name LIKE ? OR phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (roleFilter) {
      conditions.push('role = ?');
      params.push(roleFilter);
    }
    if (statusFilter) {
      conditions.push("COALESCE(status,'active') = ?");
      params.push(statusFilter);
    }

    const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

    const [users] = await pool.query(
      `SELECT id, username, email, full_name, phone, role, COALESCE(status,'active') as status, created_at, COALESCE(balance,0) as balance FROM users${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [totalResult] = await pool.query(
      `SELECT COUNT(*) as total FROM users${where}`,
      params
    );

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

// CREATE user
export async function POST(request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDatabaseSchema();
    const { username, email, password, role, full_name, phone } = await request.json();

    if (!username?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ message: 'Username, email và mật khẩu là bắt buộc' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 });
    }

    // Check duplicate
    const [existingUser] = await pool.query('SELECT id FROM users WHERE username = ? OR email = ?', [username.trim(), email.trim()]);
    if (existingUser.length > 0) {
      return NextResponse.json({ message: 'Username hoặc email đã tồn tại' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const userRole = ['admin', 'moderator', 'member'].includes(role) ? role : 'member';

    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, full_name, phone, status) VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [username.trim(), email.trim(), passwordHash, userRole, full_name?.trim() || null, phone?.trim() || null]
    );

    return NextResponse.json({ message: 'Tạo user thành công', userId: result.insertId });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ message: 'Lỗi tạo user' }, { status: 500 });
  }
}

// UPDATE user
export async function PUT(request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDatabaseSchema();
    const body = await request.json();
    const { userId, action } = body;

    if (!userId) {
      return NextResponse.json({ message: 'Missing userId' }, { status: 400 });
    }

    // Quick actions: ban/unban
    if (action === 'ban' || action === 'unban') {
      if (userId === session.userId) {
        return NextResponse.json({ message: 'Không thể thay đổi tài khoản của chính mình' }, { status: 400 });
      }
      const newStatus = action === 'ban' ? 'banned' : 'active';
      await pool.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, userId]);
      return NextResponse.json({ message: action === 'ban' ? 'Đã ban user' : 'Đã unban user' });
    }

    // Full edit
    if (action === 'edit') {
      const { username, email, full_name, phone, role, status, balance, new_password } = body;

      if (userId === session.userId && role && role !== 'admin') {
        return NextResponse.json({ message: 'Không thể hạ role của chính mình' }, { status: 400 });
      }

      // Check duplicate username/email
      if (username) {
        const [dup] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [username.trim(), userId]);
        if (dup.length > 0) return NextResponse.json({ message: 'Username đã tồn tại' }, { status: 400 });
      }
      if (email) {
        const [dup] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email.trim(), userId]);
        if (dup.length > 0) return NextResponse.json({ message: 'Email đã tồn tại' }, { status: 400 });
      }

      const updates = [];
      const params = [];

      if (username !== undefined) { updates.push('username = ?'); params.push(username.trim()); }
      if (email !== undefined) { updates.push('email = ?'); params.push(email.trim()); }
      if (full_name !== undefined) { updates.push('full_name = ?'); params.push(full_name.trim() || null); }
      if (phone !== undefined) { updates.push('phone = ?'); params.push(phone.trim() || null); }
      if (role && ['admin', 'moderator', 'member'].includes(role)) { updates.push('role = ?'); params.push(role); }
      if (status && ['active', 'banned'].includes(status)) { updates.push('status = ?'); params.push(status); }
      if (balance !== undefined) { updates.push('balance = ?'); params.push(parseInt(balance) || 0); }

      if (new_password) {
        if (new_password.length < 6) return NextResponse.json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' }, { status: 400 });
        const hash = await hashPassword(new_password);
        updates.push('password_hash = ?');
        params.push(hash);
      }

      if (updates.length === 0) return NextResponse.json({ message: 'Không có gì thay đổi' }, { status: 400 });

      params.push(userId);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
      return NextResponse.json({ message: 'Cập nhật user thành công' });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ message: 'Lỗi cập nhật user' }, { status: 500 });
  }
}

// DELETE user
export async function DELETE(request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDatabaseSchema();
    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get('id'));
    if (!userId) return NextResponse.json({ message: 'Missing user id' }, { status: 400 });

    if (userId === session.userId) {
      return NextResponse.json({ message: 'Không thể xóa tài khoản của chính mình' }, { status: 400 });
    }

    // Check if user is admin
    const [users] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (users.length === 0) return NextResponse.json({ message: 'User không tồn tại' }, { status: 404 });
    if (users[0].role === 'admin') return NextResponse.json({ message: 'Không thể xóa tài khoản admin' }, { status: 400 });

    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    return NextResponse.json({ message: 'Đã xóa user thành công' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ message: 'Lỗi xóa user' }, { status: 500 });
  }
}
