import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema } from '@/lib/dbUtils';
import { makePartyCode, publicParty } from '@/lib/watchParty';

export const dynamic = 'force-dynamic';

// Danh sách phòng mình tạo hoặc đã tham gia
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await ensureDatabaseSchema();
    const [rows] = await pool.query(
      `SELECT p.*, u.username AS host_name,
              (SELECT COUNT(*) FROM watch_party_members m2 WHERE m2.party_id = p.id) AS member_count
       FROM watch_parties p
       JOIN watch_party_members m ON m.party_id = p.id AND m.user_id = ?
       JOIN users u ON u.id = p.host_id
       ORDER BY p.status = 'open' DESC, p.created_at DESC LIMIT 30`,
      [session.userId]
    );
    return NextResponse.json({
      parties: rows.map((r) => ({ ...publicParty(r), member_count: Number(r.member_count), is_host: r.host_id === session.userId })),
    });
  } catch (e) {
    console.error('Watch party list error:', e);
    return NextResponse.json({ message: 'Lỗi tải phòng' }, { status: 500 });
  }
}

// Tạo phòng mới
export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await ensureDatabaseSchema();
    const { title, movie_slug, movie_name, movie_thumb, episode_slug } = await request.json();
    if (!movie_slug || !movie_name) {
      return NextResponse.json({ message: 'Chọn phim trước đã nhé' }, { status: 400 });
    }

    const [openCount] = await pool.query(
      "SELECT COUNT(*) AS c FROM watch_parties WHERE host_id = ? AND status = 'open'",
      [session.userId]
    );
    if (Number(openCount[0].c) >= 5) {
      return NextResponse.json({ message: 'Bạn đang mở tối đa 5 phòng. Đóng bớt phòng cũ nhé!' }, { status: 400 });
    }

    const roomTitle = String(title || '').trim().slice(0, 120) || `Cày ${String(movie_name).slice(0, 100)}`;
    for (let i = 0; i < 5; i++) {
      const code = makePartyCode();
      try {
        const [res] = await pool.query(
          `INSERT INTO watch_parties (code, host_id, title, movie_slug, movie_name, movie_thumb, episode_slug)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [code, session.userId, roomTitle, String(movie_slug).slice(0, 255), String(movie_name).slice(0, 500), movie_thumb || null, episode_slug || null]
        );
        await pool.query('INSERT IGNORE INTO watch_party_members (party_id, user_id) VALUES (?, ?)', [res.insertId, session.userId]);
        return NextResponse.json({ code });
      } catch (e) {
        if (e.code !== 'ER_DUP_ENTRY') throw e;
      }
    }
    return NextResponse.json({ message: 'Không tạo được phòng, thử lại nhé' }, { status: 500 });
  } catch (e) {
    console.error('Watch party create error:', e);
    return NextResponse.json({ message: 'Lỗi tạo phòng' }, { status: 500 });
  }
}
