import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { getPartyByCode, publicParty, ONLINE_WINDOW_MS } from '@/lib/watchParty';

export const dynamic = 'force-dynamic';

const COUNTDOWN_MS = 10 * 1000;

// Trạng thái phòng (client poll mỗi ~3 giây). ?after=<messageId> để lấy tin nhắn mới.
export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const party = await getPartyByCode(params.code);
    if (!party) return NextResponse.json({ message: 'Phòng không tồn tại' }, { status: 404 });

    const [memberRow] = await pool.query(
      'SELECT 1 FROM watch_party_members WHERE party_id = ? AND user_id = ?',
      [party.id, session.userId]
    );
    const isMember = memberRow.length > 0;
    if (isMember) {
      await pool.query('UPDATE watch_party_members SET last_seen = ? WHERE party_id = ? AND user_id = ?', [new Date(), party.id, session.userId]);
    }

    const [members] = await pool.query(
      `SELECT u.id, u.username, u.avatar, u.faction, m.last_seen
       FROM watch_party_members m JOIN users u ON u.id = m.user_id
       WHERE m.party_id = ? ORDER BY m.joined_at ASC LIMIT 100`,
      [party.id]
    );

    let messages = [];
    if (isMember) {
      const after = Number(new URL(request.url).searchParams.get('after')) || 0;
      const [rows] = await pool.query(
        `SELECT msg.id, msg.content, msg.created_at, u.id AS user_id, u.username, u.faction
         FROM watch_party_messages msg JOIN users u ON u.id = msg.user_id
         WHERE msg.party_id = ? AND msg.id > ? ORDER BY msg.id DESC LIMIT 50`,
        [party.id, after]
      );
      messages = rows.reverse();
    }

    const now = Date.now();
    return NextResponse.json({
      party: publicParty(party),
      isHost: party.host_id === session.userId,
      isMember,
      members: members.map((m) => ({
        id: m.id,
        username: m.username,
        avatar: m.avatar,
        faction: m.faction,
        online: now - new Date(m.last_seen).getTime() < ONLINE_WINDOW_MS,
      })),
      messages,
      serverTime: new Date(now).toISOString(),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) {
    console.error('Watch party GET error:', e);
    return NextResponse.json({ message: 'Lỗi tải phòng' }, { status: 500 });
  }
}

// action: join | leave | message | start | episode | close
export async function POST(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const party = await getPartyByCode(params.code);
    if (!party) return NextResponse.json({ message: 'Phòng không tồn tại' }, { status: 404 });
    const { action, content, episode_slug } = await request.json();
    const isHost = party.host_id === session.userId;

    if (party.status === 'closed' && action !== 'leave') {
      return NextResponse.json({ message: 'Phòng đã đóng' }, { status: 400 });
    }

    if (action === 'join') {
      const [cnt] = await pool.query('SELECT COUNT(*) AS c FROM watch_party_members WHERE party_id = ?', [party.id]);
      if (Number(cnt[0].c) >= 50) return NextResponse.json({ message: 'Phòng đã full 50 người' }, { status: 400 });
      await pool.query('INSERT IGNORE INTO watch_party_members (party_id, user_id) VALUES (?, ?)', [party.id, session.userId]);
      return NextResponse.json({ message: 'Đã vào phòng' });
    }

    if (action === 'leave') {
      if (isHost) return NextResponse.json({ message: 'Chủ phòng hãy dùng "Đóng phòng"' }, { status: 400 });
      await pool.query('DELETE FROM watch_party_members WHERE party_id = ? AND user_id = ?', [party.id, session.userId]);
      return NextResponse.json({ message: 'Đã rời phòng' });
    }

    if (action === 'message') {
      const text = String(content || '').trim().slice(0, 500);
      if (!text) return NextResponse.json({ message: 'Tin nhắn trống' }, { status: 400 });
      const [m] = await pool.query('SELECT 1 FROM watch_party_members WHERE party_id = ? AND user_id = ?', [party.id, session.userId]);
      if (!m.length) return NextResponse.json({ message: 'Vào phòng trước đã' }, { status: 403 });
      const [ins] = await pool.query('INSERT INTO watch_party_messages (party_id, user_id, content) VALUES (?, ?, ?)', [party.id, session.userId, text]);
      return NextResponse.json({ message: 'ok', id: ins.insertId, content: text });
    }

    if (action === 'start') {
      if (!isHost) return NextResponse.json({ message: 'Chỉ chủ phòng mới bấm được' }, { status: 403 });
      const startsAt = new Date(Date.now() + COUNTDOWN_MS);
      await pool.query(
        'UPDATE watch_parties SET starts_at = ?, episode_slug = COALESCE(?, episode_slug) WHERE id = ?',
        [startsAt, episode_slug ? String(episode_slug).slice(0, 255) : null, party.id]
      );
      return NextResponse.json({ message: 'Đếm ngược bắt đầu!', starts_at: startsAt.toISOString() });
    }

    // Lưu tập đang chiếu (để danh sách phòng & người vào sau biết tập nào)
    if (action === 'episode') {
      if (!isHost) return NextResponse.json({ message: 'Chỉ chủ phòng mới đổi được tập' }, { status: 403 });
      if (!episode_slug) return NextResponse.json({ message: 'Thiếu tập' }, { status: 400 });
      await pool.query('UPDATE watch_parties SET episode_slug = ? WHERE id = ?', [String(episode_slug).slice(0, 255), party.id]);
      return NextResponse.json({ message: 'ok' });
    }

    if (action === 'close') {
      if (!isHost) return NextResponse.json({ message: 'Chỉ chủ phòng mới đóng được' }, { status: 403 });
      await pool.query("UPDATE watch_parties SET status = 'closed' WHERE id = ?", [party.id]);
      return NextResponse.json({ message: 'Đã đóng phòng' });
    }

    return NextResponse.json({ message: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (e) {
    console.error('Watch party POST error:', e);
    return NextResponse.json({ message: 'Lỗi xử lý' }, { status: 500 });
  }
}
