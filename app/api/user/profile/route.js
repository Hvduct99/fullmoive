import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, deleteSession } from '@/lib/session';
import { verifyPassword, hashPassword } from '@/lib/password';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [session.userId]);
    if (users.length === 0) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const u = users[0];
    return NextResponse.json({
      user: {
        id: u.id,
        username: u.username || '',
        email: u.email || '',
        full_name: u.full_name || '',
        phone: u.phone || '',
        avatar: u.avatar || '',
        role: u.role || 'user',
        balance: Number(u.balance || 0),
        created_at: u.created_at,
      },
      stats: { watchedMovies: 0 }
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
    return NextResponse.json({ message: 'Error fetching profile' }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    if (body.action === 'change_password') {
      const { current_password, new_password } = body;
      if (!current_password || !new_password) return NextResponse.json({ message: 'Thiếu thông tin' }, { status: 400 });
      if (new_password.length < 6) return NextResponse.json({ message: 'Mật khẩu mới tối thiểu 6 ký tự' }, { status: 400 });

      const [users] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [session.userId]);
      if (!users.length) return NextResponse.json({ message: 'User not found' }, { status: 404 });

      const ok = await verifyPassword(current_password, users[0].password_hash);
      if (!ok) return NextResponse.json({ message: 'Mật khẩu hiện tại sai' }, { status: 400 });

      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(new_password), session.userId]);
      return NextResponse.json({ message: 'Đổi mật khẩu thành công!' });
    }

    const { full_name, phone, username, email } = body;
    if (username) {
      const [dup] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, session.userId]);
      if (dup.length) return NextResponse.json({ message: 'Tên đăng nhập đã tồn tại' }, { status: 400 });
    }
    if (email) {
      const [dup] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, session.userId]);
      if (dup.length) return NextResponse.json({ message: 'Email đã tồn tại' }, { status: 400 });
    }

    await pool.query(
      'UPDATE users SET username = COALESCE(?,username), email = COALESCE(?,email), full_name = ?, phone = ? WHERE id = ?',
      [username || null, email || null, full_name || null, phone || null, session.userId]
    );
    return NextResponse.json({ message: 'Cập nhật thành công!' });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ message: 'Cập nhật thất bại' }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  if (session.role === 'admin') return NextResponse.json({ message: 'Admin không thể tự xóa' }, { status: 403 });

  try {
    await pool.query('DELETE FROM users WHERE id = ?', [session.userId]);
    await deleteSession();
    return NextResponse.json({ message: 'Đã xóa tài khoản' });
  } catch (error) {
    return NextResponse.json({ message: 'Xóa thất bại' }, { status: 500 });
  }
}
