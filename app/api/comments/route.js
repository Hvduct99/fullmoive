import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema } from '@/lib/dbUtils';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const movieSlug = searchParams.get('movie_slug');
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    await ensureDatabaseSchema();

    let query = 'SELECT c.id, c.user_id, c.movie_slug, c.content, c.rating, c.status, c.created_at, c.updated_at, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.status = "visible"';
    const params = [];

    if (movieSlug) {
      query += ' AND c.movie_slug = ?';
      params.push(movieSlug);
    }

    query += ' ORDER BY c.created_at DESC LIMIT ?';
    params.push(limit);

    const [comments] = await pool.query(query, params);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Fetch comments error:', error);
    return NextResponse.json({ message: 'Lỗi lấy bình luận', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDatabaseSchema();

    const body = await request.json();
    const { movie_slug, content, rating } = body;

    if (!movie_slug || !content || !content.trim()) {
      return NextResponse.json({ message: 'Yêu cầu movie_slug và nội dung comment.' }, { status: 400 });
    }

    const [result] = await pool.query(
      'INSERT INTO comments (user_id, movie_slug, content, rating, status) VALUES (?, ?, ?, ?, ?)',
      [session.userId, movie_slug, content.trim(), rating ? Number(rating) : null, 'visible']
    );

    return NextResponse.json({ message: 'Đã tạo bình luận', id: result.insertId });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json({ message: 'Lỗi tạo bình luận', error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDatabaseSchema();

    const body = await request.json();
    const { id, content, rating, status } = body;
    if (!id) {
      return NextResponse.json({ message: 'Missing comment id' }, { status: 400 });
    }

    // Người dùng chỉ cập nhật comment của mình, admin có thể cập nhật mọi comment (phía admin route riêng)
    const [rows] = await pool.query('SELECT user_id FROM comments WHERE id = ?', [id]);
    if (rows.length === 0) {
      return NextResponse.json({ message: 'Bình luận không tồn tại' }, { status: 404 });
    }

    if (rows[0].user_id !== session.userId) {
      return NextResponse.json({ message: 'Không được phép chỉnh sửa bình luận này' }, { status: 403 });
    }

    const fields = [];
    const values = [];

    if (content !== undefined) {
      fields.push('content = ?');
      values.push(content.trim());
    }
    if (rating !== undefined) {
      fields.push('rating = ?');
      values.push(Number(rating));
    }

    if (fields.length === 0) {
      return NextResponse.json({ message: 'Không có gì để cập nhật' }, { status: 400 });
    }

    values.push(id);
    await pool.query(`UPDATE comments SET ${fields.join(', ')} WHERE id = ?`, values);

    return NextResponse.json({ message: 'Cập nhật bình luận thành công' });
  } catch (error) {
    console.error('Update comment error:', error);
    return NextResponse.json({ message: 'Lỗi cập nhật bình luận', error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDatabaseSchema();

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ message: 'Missing comment id' }, { status: 400 });
    }

    const [rows] = await pool.query('SELECT user_id FROM comments WHERE id = ?', [id]);
    if (rows.length === 0) {
      return NextResponse.json({ message: 'Bình luận không tồn tại' }, { status: 404 });
    }

    if (rows[0].user_id !== session.userId) {
      return NextResponse.json({ message: 'Không được phép xóa bình luận này' }, { status: 403 });
    }

    await pool.query('DELETE FROM comments WHERE id = ?', [id]);

    return NextResponse.json({ message: 'Xóa bình luận thành công' });
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json({ message: 'Lỗi xóa bình luận', error: error.message }, { status: 500 });
  }
}
