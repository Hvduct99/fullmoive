import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, deleteSession } from '@/lib/session';
import { getUserVipState } from '@/lib/vip';
import { verifyPassword, hashPassword } from '@/lib/password';
import { ensureDatabaseSchema } from '@/lib/dbUtils';

// READ - Get user profile
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDatabaseSchema();

    const [users] = await pool.query(
      'SELECT id, username, email, full_name, phone, avatar, role, status, created_at, vip_expire_at, COALESCE(balance,0) as balance FROM users WHERE id = ?',
      [session.userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const user = users[0];

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
        balance: Number(user.balance || 0),
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

// UPDATE - Update user profile info
export async function PUT(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    // Change password
    if (action === 'change_password') {
      const { current_password, new_password } = body;

      if (!current_password || !new_password) {
        return NextResponse.json({ message: 'Vui lòng điền đầy đủ mật khẩu' }, { status: 400 });
      }
      if (new_password.length < 6) {
        return NextResponse.json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' }, { status: 400 });
      }

      const [users] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [session.userId]);
      if (users.length === 0) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }

      const isValid = await verifyPassword(current_password, users[0].password_hash);
      if (!isValid) {
        return NextResponse.json({ message: 'Mật khẩu hiện tại không đúng' }, { status: 400 });
      }

      const newHash = await hashPassword(new_password);
      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, session.userId]);

      return NextResponse.json({ message: 'Đổi mật khẩu thành công!' });
    }

    // Update profile info
    const { full_name, phone, username, email } = body;

    // Check username uniqueness if changed
    if (username) {
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, session.userId]
      );
      if (existing.length > 0) {
        return NextResponse.json({ message: 'Tên đăng nhập đã được sử dụng' }, { status: 400 });
      }
    }

    // Check email uniqueness if changed
    if (email) {
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, session.userId]
      );
      if (existing.length > 0) {
        return NextResponse.json({ message: 'Email đã được sử dụng' }, { status: 400 });
      }
    }

    try {
      await pool.query(
        'UPDATE users SET username = ?, email = ?, full_name = ?, phone = ? WHERE id = ?',
        [username, email, full_name || null, phone || null, session.userId]
      );
    } catch (e) {
      await pool.query(
        'UPDATE users SET username = ?, email = ? WHERE id = ?',
        [username, email, session.userId]
      );
    }

    return NextResponse.json({ message: 'Cập nhật thành công!' });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ message: 'Cập nhật thất bại' }, { status: 500 });
  }
}

// DELETE - Delete user account
export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Don't allow admin to delete themselves
    if (session.role === 'admin') {
      return NextResponse.json({ message: 'Admin không thể tự xóa tài khoản' }, { status: 403 });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [session.userId]);
    await deleteSession();

    return NextResponse.json({ message: 'Tài khoản đã được xóa' });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ message: 'Xóa tài khoản thất bại' }, { status: 500 });
  }
}
