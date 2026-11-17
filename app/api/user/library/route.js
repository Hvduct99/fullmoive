import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema } from '@/lib/dbUtils';

export const dynamic = 'force-dynamic';

const LISTS = ['saved', 'favorite'];

// GET ?list=saved|favorite → danh sách; ?slug=<movie> → phim này nằm trong list nào
export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await ensureDatabaseSchema();
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    if (slug) {
      const [rows] = await pool.query('SELECT list FROM user_library WHERE user_id = ? AND movie_slug = ?', [session.userId, slug]);
      return NextResponse.json({ lists: rows.map((r) => r.list) });
    }
    const list = searchParams.get('list');
    const params = [session.userId];
    let sql = 'SELECT id, list, movie_slug, movie_name, movie_thumb, movie_year, created_at FROM user_library WHERE user_id = ?';
    if (LISTS.includes(list)) { sql += ' AND list = ?'; params.push(list); }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    const [items] = await pool.query(sql, params);
    return NextResponse.json({ items });
  } catch (e) {
    console.error('Library GET error:', e);
    return NextResponse.json({ message: 'Lỗi tải tủ phim' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await ensureDatabaseSchema();
    const { list, movie_slug, movie_name, movie_thumb, movie_year } = await request.json();
    if (!LISTS.includes(list) || !movie_slug || !movie_name) {
      return NextResponse.json({ message: 'Thiếu thông tin' }, { status: 400 });
    }
    await pool.query(
      `INSERT INTO user_library (user_id, list, movie_slug, movie_name, movie_thumb, movie_year)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE movie_name = VALUES(movie_name), movie_thumb = VALUES(movie_thumb)`,
      [session.userId, list, String(movie_slug).slice(0, 255), String(movie_name).slice(0, 500), movie_thumb || null, movie_year ? String(movie_year).slice(0, 10) : null]
    );
    return NextResponse.json({ message: 'Đã thêm vào tủ phim' });
  } catch (e) {
    console.error('Library POST error:', e);
    return NextResponse.json({ message: 'Lỗi lưu phim' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await ensureDatabaseSchema();
    const { searchParams } = new URL(request.url);
    const list = searchParams.get('list');
    const slug = searchParams.get('slug');
    if (!LISTS.includes(list) || !slug) return NextResponse.json({ message: 'Thiếu thông tin' }, { status: 400 });
    await pool.query('DELETE FROM user_library WHERE user_id = ? AND list = ? AND movie_slug = ?', [session.userId, list, slug]);
    return NextResponse.json({ message: 'Đã gỡ khỏi tủ phim' });
  } catch (e) {
    console.error('Library DELETE error:', e);
    return NextResponse.json({ message: 'Lỗi xử lý' }, { status: 500 });
  }
}
