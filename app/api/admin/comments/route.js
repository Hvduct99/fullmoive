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
    const [comments] = await pool.query(
      `SELECT c.id, u.username, c.movie_slug, c.content, c.rating, c.status, c.created_at
       FROM comments c JOIN users u ON c.user_id = u.id
       ORDER BY c.created_at DESC LIMIT 200`
    );
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Admin comments GET error:', error);
    return NextResponse.json({ message: 'Lỗi tải bình luận' }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDatabaseSchema();
    const { id, status, content } = await request.json();

    if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

    const updates = [];
    const params = [];
    if (status) { updates.push('status = ?'); params.push(status); }
    if (content !== undefined) { updates.push('content = ?'); params.push(content); }
    if (updates.length === 0) return NextResponse.json({ message: 'Không có gì cập nhật' }, { status: 400 });

    params.push(id);
    await pool.query(`UPDATE comments SET ${updates.join(', ')} WHERE id = ?`, params);
    return NextResponse.json({ message: 'Cập nhật bình luận thành công' });
  } catch (error) {
    console.error('Admin comments PUT error:', error);
    return NextResponse.json({ message: 'Lỗi cập nhật bình luận' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDatabaseSchema();
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));
    if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

    await pool.query('DELETE FROM comments WHERE id = ?', [id]);
    return NextResponse.json({ message: 'Đã xóa bình luận' });
  } catch (error) {
    console.error('Admin comments DELETE error:', error);
    return NextResponse.json({ message: 'Lỗi xóa bình luận' }, { status: 500 });
  }
}
