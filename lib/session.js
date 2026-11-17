import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import pool from './db';
import { ensureDatabaseSchema } from './dbUtils';

const secretKey = process.env.SESSION_SECRET || 'changethissecret12345';
const encodedKey = new TextEncoder().encode(secretKey);

export const SESSION_COOKIE = 'session';
const SESSION_DAYS = 7;
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

function clientMeta(request) {
  if (!request) return { userAgent: null, ip: null };
  const h = request.headers;
  const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || null;
  return { userAgent: (h.get('user-agent') || '').slice(0, 500) || null, ip: ip ? ip.slice(0, 64) : null };
}

/**
 * Tạo phiên đăng nhập mới + ghi nhận thiết bị.
 * Chỉ gọi trong Route Handler / Server Action (nơi được phép set cookie).
 */
export async function createSession(userId, role, request) {
  const sid = randomUUID();
  const { userAgent, ip } = clientMeta(request);

  try {
    await ensureDatabaseSchema();
    await pool.query(
      'INSERT INTO user_sessions (sid, user_id, user_agent, ip) VALUES (?, ?, ?, ?)',
      [sid, userId, userAgent, ip]
    );
  } catch (e) {
    // Không chặn đăng nhập nếu bảng thiết bị lỗi
    console.error('createSession device log error:', e.message);
  }

  const token = await new SignJWT({ userId, role, sid })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(encodedKey);

  // cookies() phải được gọi NGOÀI try/catch để Next.js nhận diện route là dynamic.
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    expires: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
    sameSite: 'lax',
    path: '/',
  });
  return sid;
}

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] });
    return payload;
  } catch {
    return null;
  }
}

/**
 * Đọc + xác thực phiên. Trả về payload { userId, role, sid } hoặc null.
 *
 * QUAN TRỌNG: cookies() được gọi ở ngoài mọi try/catch. Trước đây lời gọi này
 * nằm trong try/catch nên lúc `next build` lỗi "dynamic usage" bị nuốt mất và
 * Next.js prerender /api/auth/session thành file TĨNH luôn trả { user: null }
 * → header/sidebar/dashboard luôn coi như chưa đăng nhập.
 */
export async function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.userId) return null;

  // Phiên cũ (trước khi có quản lý thiết bị) không có sid → vẫn hợp lệ.
  if (!payload.sid) return payload;

  try {
    await ensureDatabaseSchema();
    const [rows] = await pool.query(
      'SELECT user_id, last_seen FROM user_sessions WHERE sid = ? LIMIT 1',
      [payload.sid]
    );
    // Thiết bị đã bị đăng xuất từ xa
    if (rows.length === 0 || Number(rows[0].user_id) !== Number(payload.userId)) return null;

    const lastSeen = rows[0].last_seen ? new Date(rows[0].last_seen).getTime() : 0;
    if (Date.now() - lastSeen > LAST_SEEN_THROTTLE_MS) {
      pool.query('UPDATE user_sessions SET last_seen = NOW() WHERE sid = ?', [payload.sid]).catch(() => {});
    }
  } catch (e) {
    // Lỗi DB tạm thời: không đá người dùng ra ngoài
    console.error('getSession validate error:', e.message);
  }
  return payload;
}

export async function deleteSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const payload = await verifyToken(token);
    if (payload?.sid) {
      await pool.query('DELETE FROM user_sessions WHERE sid = ?', [payload.sid]).catch(() => {});
    }
  }
  cookieStore.delete(SESSION_COOKIE);
}

// Giữ tương thích tên cũ
export const updateSession = getSession;
