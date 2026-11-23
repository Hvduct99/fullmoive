/**
 * Kênh chat Rạp Chung.
 * Tin nhắn lưu DB (người vào sau vẫn thấy lịch sử) rồi phát realtime qua namespace Socket.IO "/cinema"
 * (Socket.IO chạy chung tiến trình với web nên route API phát trực tiếp được qua globalThis).
 */
import pool from './db';
import { ensureDatabaseSchema } from './dbUtils';
import { WalletError } from './wallet';

export const CHAT_MAX_LEN = 300;
const HISTORY_LIMIT = 60;

// Giới hạn tốc độ: tối thiểu 1,5 giây giữa 2 tin, tối đa 8 tin / 30 giây mỗi người
const rate = (globalThis.__cinemaChatRate = globalThis.__cinemaChatRate || new Map());
function checkRate(userId) {
  const now = Date.now();
  const hits = (rate.get(userId) || []).filter((t) => now - t < 30000);
  if (hits.length && now - hits[hits.length - 1] < 1500) throw new WalletError('Gõ chậm lại chút nha 😅', 429, 'RATE_LIMIT');
  if (hits.length >= 8) throw new WalletError('Bạn nhắn hơi nhanh, đợi vài giây nhé', 429, 'RATE_LIMIT');
  hits.push(now);
  rate.set(userId, hits);
}

function nsp() {
  try {
    return globalThis.__watchParty?.io?.of('/cinema') || null;
  } catch {
    return null;
  }
}

/** Phát sự kiện tới mọi người đang ở trang Rạp Chung (không có realtime thì bỏ qua, client tự poll). */
export function broadcastCinema(event, payload) {
  const n = nsp();
  if (n) n.emit(event, payload);
}

export function viewerCount() {
  const n = nsp();
  return n ? n.sockets.size : null;
}

function toPublic(r) {
  return {
    id: Number(r.id),
    user_id: Number(r.user_id),
    username: r.username,
    faction: r.faction === 'girlz' ? 'girlz' : 'boiz',
    role: r.role,
    content: r.content,
    created_at_ms: Number(r.created_at_ms),
  };
}

export async function listMessages(after = 0) {
  await ensureDatabaseSchema();
  const a = Math.max(0, Number(after) || 0);
  const [rows] = await pool.query(
    `SELECT id, user_id, username, faction, role, content, created_at_ms FROM cinema_chat
     WHERE deleted = 0 AND id > ? ORDER BY id DESC LIMIT ?`,
    [a, HISTORY_LIMIT]
  );
  return rows.reverse().map(toPublic);
}

export async function postMessage(userId, rawContent) {
  const content = String(rawContent || '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX_LEN);
  if (!content) throw new WalletError('Tin nhắn trống');
  await ensureDatabaseSchema();
  const [u] = await pool.query('SELECT username, faction, role, status FROM users WHERE id = ?', [userId]);
  if (!u.length) throw new WalletError('Tài khoản không tồn tại', 404);
  if (u[0].status === 'banned') throw new WalletError('Tài khoản đã bị khoá', 403);
  checkRate(userId);
  const row = {
    user_id: userId,
    username: String(u[0].username || 'user').slice(0, 100),
    faction: u[0].faction === 'girlz' ? 'girlz' : 'boiz',
    role: u[0].role || 'member',
    content,
    created_at_ms: Date.now(),
  };
  const [ins] = await pool.query(
    'INSERT INTO cinema_chat (user_id, username, faction, role, content, created_at_ms) VALUES (?, ?, ?, ?, ?, ?)',
    [row.user_id, row.username, row.faction, row.role, row.content, row.created_at_ms]
  );
  const msg = toPublic({ id: ins.insertId, ...row });
  broadcastCinema('chat:new', msg);
  return msg;
}

export async function deleteMessage(role, id) {
  if (role !== 'admin' && role !== 'moderator') throw new WalletError('Chỉ quản trị viên mới xoá được', 403);
  await ensureDatabaseSchema();
  await pool.query('UPDATE cinema_chat SET deleted = 1 WHERE id = ?', [Number(id)]);
  broadcastCinema('chat:delete', { id: Number(id) });
  return { ok: true };
}
