import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema } from '@/lib/dbUtils';

export async function GET(request) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'moderator')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const movieFilter = searchParams.get('movie') || '';
  const offset = (page - 1) * limit;

  try {
    await ensureDatabaseSchema();

    let conditions = [];
    let params = [];

    if (search) {
      conditions.push('(u.username LIKE ? OR c.content LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (statusFilter) {
      conditions.push('c.status = ?');
      params.push(statusFilter);
    }
    if (movieFilter) {
      conditions.push('c.movie_slug LIKE ?');
      params.push(`%${movieFilter}%`);
    }

    const where = conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '';

    const [comments] = await pool.query(
      `SELECT c.id, c.user_id, u.username, c.movie_slug, c.content, c.rating, c.status, c.created_at, c.updated_at
       FROM comments c JOIN users u ON c.user_id = u.id
       WHERE 1=1${where}
       ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [totalResult] = await pool.query(
      `SELECT COUNT(*) as total FROM comments c JOIN users u ON c.user_id = u.id WHERE 1=1${where}`,
      params
    );

    return NextResponse.json({
      comments,
      total: totalResult[0].total,
      page,
      totalPages: Math.ceil(totalResult[0].total / limit)
    });
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
    const { id, status, content, rating, movie_slug } = await request.json();

    if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

    const updates = [];
    const params = [];
    if (status && ['visible', 'hidden'].includes(status)) { updates.push('status = ?'); params.push(status); }
    if (content !== undefined) { updates.push('content = ?'); params.push(content.trim()); }
    if (rating !== undefined) { updates.push('rating = ?'); params.push(rating === '' || rating === null ? null : Number(rating)); }
    if (movie_slug !== undefined) { updates.push('movie_slug = ?'); params.push(movie_slug.trim() || null); }
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
