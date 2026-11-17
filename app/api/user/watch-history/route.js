import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema } from '@/lib/dbUtils';

export const dynamic = 'force-dynamic';

// GET - Fetch user's watch history
export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await ensureDatabaseSchema();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20') || 20, 1), 50);
    // continue=1 → chỉ lấy phim đang xem dở (chưa xem xong)
    const onlyUnfinished = searchParams.get('continue') === '1';

    const [history] = await pool.query(
      `SELECT id, movie_slug, movie_name, movie_thumb, movie_year, episode_slug, episode_name,
              progress, episode_index, episode_total, watched_at
       FROM watch_history WHERE user_id = ? ${onlyUnfinished ? 'AND (progress IS NULL OR progress < 98)' : ''}
       ORDER BY watched_at DESC LIMIT ?`,
      [session.userId, limit]
    );

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Fetch watch history error:', error);
    return NextResponse.json({ message: 'Lỗi lấy lịch sử xem' }, { status: 500 });
  }
}

// POST - Add/update watch history entry
export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await ensureDatabaseSchema();
    const { movie_slug, movie_name, movie_thumb, movie_year, episode_slug, episode_name, progress, episode_index, episode_total } = await request.json();

    if (!movie_slug || !movie_name) {
      return NextResponse.json({ message: 'movie_slug và movie_name là bắt buộc' }, { status: 400 });
    }

    const toInt = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Math.round(Number(v)));
    const prog = toInt(progress) === null ? null : Math.max(0, Math.min(100, toInt(progress)));
    const epIdx = toInt(episode_index);
    const epTotal = toInt(episode_total) || null;

    // Upsert. Thứ tự gán quan trọng: progress phải tính TRƯỚC khi episode_slug bị ghi đè.
    // Cùng tập → giữ tiến độ cao nhất; đổi tập → dùng tiến độ mới.
    await pool.query(
      `INSERT INTO watch_history (user_id, movie_slug, movie_name, movie_thumb, movie_year, episode_slug, episode_name, progress, episode_index, episode_total, watched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         progress = IF(VALUES(progress) IS NULL, progress,
                       IF(episode_slug <=> VALUES(episode_slug), GREATEST(COALESCE(progress, 0), VALUES(progress)), VALUES(progress))),
         episode_index = COALESCE(VALUES(episode_index), episode_index),
         episode_total = COALESCE(VALUES(episode_total), episode_total),
         movie_name = VALUES(movie_name),
         movie_thumb = VALUES(movie_thumb),
         episode_slug = VALUES(episode_slug),
         episode_name = VALUES(episode_name),
         watched_at = NOW()`,
      [session.userId, movie_slug, movie_name, movie_thumb || null, movie_year || null, episode_slug || null, episode_name || null, prog, epIdx, epTotal]
    );

    return NextResponse.json({ message: 'Đã lưu lịch sử xem' });
  } catch (error) {
    console.error('Save watch history error:', error);
    return NextResponse.json({ message: 'Lỗi lưu lịch sử xem' }, { status: 500 });
  }
}

// DELETE - Remove a watch history entry or clear all
export async function DELETE(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await ensureDatabaseSchema();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('all');

    if (clearAll === 'true') {
      await pool.query('DELETE FROM watch_history WHERE user_id = ?', [session.userId]);
      return NextResponse.json({ message: 'Đã xóa toàn bộ lịch sử xem' });
    }

    if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

    const [rows] = await pool.query('SELECT user_id FROM watch_history WHERE id = ?', [id]);
    if (rows.length === 0) return NextResponse.json({ message: 'Không tìm thấy' }, { status: 404 });
    if (rows[0].user_id !== session.userId) return NextResponse.json({ message: 'Không có quyền' }, { status: 403 });

    await pool.query('DELETE FROM watch_history WHERE id = ?', [id]);
    return NextResponse.json({ message: 'Đã xóa khỏi lịch sử' });
  } catch (error) {
    console.error('Delete watch history error:', error);
    return NextResponse.json({ message: 'Lỗi xóa lịch sử' }, { status: 500 });
  }
}
