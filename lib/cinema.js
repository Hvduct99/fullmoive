/**
 * Rạp Chung — kênh chiếu phim 24/7 cho mọi người xem cùng lúc.
 *
 *  - Server giữ lịch chiếu chuẩn: { phim, tập, m3u8, duration_ms, started_at_ms }.
 *    Vị trí đang chiếu = now − started_at_ms → ai mở trang cũng xem đúng giây đang phát.
 *  - duration lấy CHÍNH XÁC bằng cách cộng #EXTINF của playlist HLS (không đoán từ "120 phút").
 *  - Hàng chờ đề xuất: xếp theo tổng tiền góp (cao → trước), bằng tiền thì ai đề xuất trước đứng trước.
 *    Ai cũng góp thêm được để đẩy phim lên. Huỷ / lỗi nguồn → hoàn tiền cho mọi người đã góp.
 *  - Hết phim → chiếu phim #1 trong hàng chờ; hàng chờ trống → tự chọn phim 2026.
 *    Đang chiếu phim tự chọn mà có người đề xuất → chuyển ngay sang phim được đề xuất.
 *  - Lịch chiếu được tính "lười" mỗi lần có người hỏi trạng thái (không cần tiến trình chạy nền),
 *    nên deploy / khởi động lại server không làm hỏng lịch.
 */
import axios from 'axios';
import pool from './db';
import { ensureDatabaseSchema } from './dbUtils';
import { getMovieDetail, PRIORITY_YEAR } from './services';
import { WalletError } from './wallet';

export const MIN_BID = 1000;
export const MAX_BID = 5000000;
export const MAX_QUEUED_PER_USER = 3;
const AUTO_MIN_DURATION_MS = 20 * 60 * 1000; // bỏ qua trailer / clip ngắn khi tự chọn
const RECENT_AUTO_KEEP = 40;
const API_BASE = 'https://phimapi.com';

// ---------- Khoá trong tiến trình: mọi thay đổi lịch chiếu chạy tuần tự ----------
let chain = Promise.resolve();
function withLock(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

// ---------- Thời lượng HLS chính xác ----------
const durationCache = new Map();

// Dùng axios + User-Agent trình duyệt (giống phần còn lại của web đang lấy phim thành công trên Hostinger)
const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: '*/*',
};
async function fetchText(url) {
  const res = await axios.get(url, { timeout: 15000, responseType: 'text', transformResponse: (d) => d, headers: HTTP_HEADERS, maxRedirects: 5 });
  return typeof res.data === 'string' ? res.data : String(res.data);
}

// Chẩn đoán (hiện trong /api/cinema khi chưa chiếu được phim)
const diag = (globalThis.__cinemaDiag = globalThis.__cinemaDiag || { candidates: 0, errors: [], at: null });
function noteError(where, e) {
  const msg = `${where}: ${e?.response?.status ? `HTTP ${e.response.status}` : e?.code || ''} ${String(e?.message || e).slice(0, 120)}`.trim();
  diag.errors = [msg, ...diag.errors].slice(0, 8);
  diag.at = new Date().toISOString();
}
export function getCinemaDiag() {
  return { candidates: diag.candidates, errors: diag.errors, at: diag.at };
}

/** Tổng thời lượng (ms) của 1 nguồn HLS = tổng #EXTINF của playlist chất lượng đầu tiên. */
export async function hlsDurationMs(m3u8Url) {
  if (durationCache.has(m3u8Url)) return durationCache.get(m3u8Url);
  let url = m3u8Url;
  let text = await fetchText(url);
  if (text.includes('#EXT-X-STREAM-INF')) {
    const lines = text.split(/\r?\n/);
    const idx = lines.findIndex((l) => l.startsWith('#EXT-X-STREAM-INF'));
    const variant = lines.slice(idx + 1).find((l) => l.trim() && !l.startsWith('#'));
    if (!variant) throw new Error('Playlist không có luồng video');
    url = new URL(variant.trim(), url).href;
    text = await fetchText(url);
  }
  let total = 0;
  for (const m of text.matchAll(/#EXTINF:([\d.]+)/g)) total += parseFloat(m[1]);
  if (!total || !Number.isFinite(total)) throw new Error('Không đọc được thời lượng video');
  const ms = Math.round(total * 1000);
  durationCache.set(m3u8Url, ms);
  return ms;
}

/** Lấy thông tin phim + tập (mặc định tập đầu tiên có nguồn m3u8). */
export async function resolveEpisode(movieSlug, episodeSlug) {
  const movie = await getMovieDetail(movieSlug);
  if (!movie) throw new WalletError('Không tìm thấy phim', 404);
  let found = null;
  for (const server of movie.episodes || []) {
    for (const ep of server.server_data || []) {
      if (!ep.link_m3u8) continue;
      if (!episodeSlug || ep.slug === episodeSlug) { found = ep; break; }
    }
    if (found) break;
  }
  if (!found) throw new WalletError(episodeSlug ? 'Tập này không có nguồn phát' : 'Phim chưa có nguồn phát', 400);
  return {
    movie_slug: movie.slug,
    movie_name: String(movie.name || movie.slug).slice(0, 500),
    movie_thumb: movie.thumb_url || movie.poster_url || null,
    episode_slug: found.slug,
    episode_name: found.name || null,
    m3u8: found.link_m3u8,
  };
}

// ---------- Hoàn tiền ----------
async function refundQueue(queueId, reason, conn) {
  const own = !conn;
  const c = conn || (await pool.getConnection());
  try {
    if (own) await c.beginTransaction();
    const [q] = await c.query('SELECT id, movie_name, status FROM cinema_queue WHERE id = ? FOR UPDATE', [queueId]);
    if (!q.length || q[0].status === 'refunded' || q[0].status === 'played') { if (own) await c.commit(); return; }
    const [contribs] = await c.query('SELECT id, user_id, amount FROM cinema_contrib WHERE queue_id = ? AND refunded = 0 FOR UPDATE', [queueId]);
    for (const ct of contribs) {
      if (ct.amount > 0) {
        await c.query('UPDATE users SET balance = COALESCE(balance, 0) + ? WHERE id = ?', [ct.amount, ct.user_id]);
        await c.query(
          "INSERT INTO transactions (user_id, amount, type, status, note, method) VALUES (?, ?, 'cinema_refund', 'completed', ?, 'wallet')",
          [ct.user_id, ct.amount, `Hoàn tiền Rạp Chung · ${q[0].movie_name}${reason ? ` (${reason})` : ''}`.slice(0, 1000)]
        );
      }
    }
    await c.query('UPDATE cinema_contrib SET refunded = 1 WHERE queue_id = ?', [queueId]);
    await c.query("UPDATE cinema_queue SET status = 'refunded' WHERE id = ?", [queueId]);
    if (own) await c.commit();
  } catch (e) {
    if (own) await c.rollback().catch(() => {});
    throw e;
  } finally {
    if (own) c.release();
  }
}

// ---------- Tự chọn phim khi không ai đề xuất ----------
let autoCandidates = { list: [], at: 0 };
async function loadAutoCandidates() {
  if (autoCandidates.list.length && Date.now() - autoCandidates.at < 30 * 60 * 1000) return autoCandidates.list;
  const urls = [
    `${API_BASE}/v1/api/danh-sach/phim-le?page=1&limit=48&year=${PRIORITY_YEAR}`,
    `${API_BASE}/v1/api/danh-sach/phim-le?page=2&limit=48&year=${PRIORITY_YEAR}`,
    `${API_BASE}/v1/api/danh-sach/phim-le?page=1&limit=48`,
  ];
  const seen = new Set();
  const list = [];
  for (const u of urls) {
    try {
      const j = JSON.parse(await fetchText(u));
      for (const m of j?.data?.items || []) {
        if (m?.slug && !seen.has(m.slug)) { seen.add(m.slug); list.push(m.slug); }
      }
    } catch (e) { noteError('danh sách phim', e); }
  }
  diag.candidates = list.length;
  if (list.length) autoCandidates = { list, at: Date.now() };
  return list;
}

async function pickAutoMovie(recent) {
  const all = await loadAutoCandidates();
  const fresh = all.filter((s) => !recent.includes(s));
  const pool2 = (fresh.length ? fresh : all).slice();
  for (let i = pool2.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool2[i], pool2[j]] = [pool2[j], pool2[i]];
  }
  for (const slug of pool2.slice(0, 10)) {
    try {
      const ep = await resolveEpisode(slug);
      const duration = await hlsDurationMs(ep.m3u8);
      if (duration < AUTO_MIN_DURATION_MS) continue;
      return { ...ep, duration_ms: duration };
    } catch (e) { noteError(slug, e); }
  }
  return null;
}

// ---------- Lịch chiếu ----------
async function writeState(s) {
  await pool.query(
    `INSERT INTO cinema_state (id, queue_id, movie_slug, movie_name, movie_thumb, episode_slug, episode_name, m3u8, duration_ms, started_at_ms, recent_auto)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE queue_id = VALUES(queue_id), movie_slug = VALUES(movie_slug), movie_name = VALUES(movie_name),
       movie_thumb = VALUES(movie_thumb), episode_slug = VALUES(episode_slug), episode_name = VALUES(episode_name),
       m3u8 = VALUES(m3u8), duration_ms = VALUES(duration_ms), started_at_ms = VALUES(started_at_ms), recent_auto = VALUES(recent_auto)`,
    [s.queue_id, s.movie_slug, s.movie_name, s.movie_thumb, s.episode_slug, s.episode_name, s.m3u8, s.duration_ms, s.started_at_ms, s.recent_auto]
  );
}

async function topQueued() {
  const [rows] = await pool.query(
    "SELECT * FROM cinema_queue WHERE status = 'queued' ORDER BY total_bid DESC, created_at_ms ASC, id ASC LIMIT 1"
  );
  return rows[0] || null;
}

async function advance(prev, now) {
  if (prev?.queue_id) {
    await pool.query("UPDATE cinema_queue SET status = 'played' WHERE id = ? AND status = 'playing'", [prev.queue_id]);
  }
  let recent = [];
  try { recent = JSON.parse(prev?.recent_auto || '[]'); } catch { recent = []; }

  // 1) Phim được đề xuất có thứ hạng cao nhất
  for (let attempt = 0; attempt < 6; attempt++) {
    const top = await topQueued();
    if (!top) break;
    let resolved = null;
    for (let tryNo = 0; tryNo < 2 && !resolved; tryNo++) {
      try {
        const ep = await resolveEpisode(top.movie_slug, top.episode_slug);
        resolved = { ...ep, duration_ms: await hlsDurationMs(ep.m3u8) };
      } catch (e) { noteError(`hàng chờ ${top.movie_slug}`, e); }
    }
    if (!resolved) {
      await refundQueue(top.id, 'nguồn phim lỗi');
      continue;
    }
    const [u] = await pool.query("UPDATE cinema_queue SET status = 'playing', played_at_ms = ? WHERE id = ? AND status = 'queued'", [now, top.id]);
    if (!u.affectedRows) continue; // vừa bị huỷ
    const state = { ...resolved, queue_id: top.id, started_at_ms: now, recent_auto: JSON.stringify(recent) };
    await writeState(state);
    return state;
  }

  // 2) Không ai đề xuất → tự chọn phim
  const auto = await pickAutoMovie(recent);
  if (!auto) return prev || null; // mạng lỗi: giữ nguyên, lần sau thử lại
  recent = [auto.movie_slug, ...recent.filter((s) => s !== auto.movie_slug)].slice(0, RECENT_AUTO_KEEP);
  const state = { ...auto, queue_id: null, started_at_ms: now, recent_auto: JSON.stringify(recent) };
  await writeState(state);
  return state;
}

/** Trạng thái đang chiếu (tự chuyển phim khi hết / khi có đề xuất mà đang chiếu phim tự chọn). */
export function getNowPlaying() {
  return withLock(async () => {
    await ensureDatabaseSchema();
    const [rows] = await pool.query('SELECT * FROM cinema_state WHERE id = 1');
    const st = rows[0] || null;
    const now = Date.now();
    const ended = !st || now >= Number(st.started_at_ms) + Number(st.duration_ms);
    const preempt = st && st.queue_id === null && !!(await topQueued());
    if (ended || preempt) return advance(st, now);
    return st;
  });
}

// ---------- Đề xuất / góp tiền / huỷ ----------
function validBid(raw) {
  const bid = Math.round(Number(raw || 0));
  if (!Number.isFinite(bid) || bid < 0) throw new WalletError('Số tiền không hợp lệ');
  if (bid > 0 && bid < MIN_BID) throw new WalletError(`Ưu tiên tối thiểu ${MIN_BID.toLocaleString('vi-VN')}đ (hoặc 0đ để đề xuất miễn phí)`);
  if (bid > MAX_BID) throw new WalletError(`Tối đa ${MAX_BID.toLocaleString('vi-VN')}đ mỗi lần`);
  return bid;
}

async function contribute(conn, userId, queueId, amount, movieName) {
  if (amount > 0) {
    const [r] = await conn.query('UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?', [amount, userId, amount]);
    if (!r.affectedRows) throw new WalletError('Số dư không đủ, bơm thêm xu nhé!', 402, 'INSUFFICIENT_BALANCE');
    await conn.query(
      "INSERT INTO transactions (user_id, amount, type, status, note, method) VALUES (?, ?, 'cinema', 'completed', ?, 'wallet')",
      [userId, -amount, `Ưu tiên Rạp Chung · ${movieName}`.slice(0, 1000)]
    );
  }
  await conn.query('INSERT INTO cinema_contrib (queue_id, user_id, amount) VALUES (?, ?, ?)', [queueId, userId, amount]);
  await conn.query('UPDATE cinema_queue SET total_bid = total_bid + ? WHERE id = ?', [amount, queueId]);
}

/** Đề xuất phim. Phim + tập đã có trong hàng chờ → tự gộp thành góp thêm cho đề xuất đó. */
export async function requestMovie(userId, { movie_slug, episode_slug, bid: rawBid }) {
  const bid = validBid(rawBid);
  if (!movie_slug) throw new WalletError('Chọn phim trước đã');
  await ensureDatabaseSchema();
  const ep = await resolveEpisode(String(movie_slug), episode_slug ? String(episode_slug) : null);

  const result = await withLock(async () => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [dup] = await conn.query(
        "SELECT id FROM cinema_queue WHERE status = 'queued' AND movie_slug = ? AND episode_slug = ? LIMIT 1 FOR UPDATE",
        [ep.movie_slug, ep.episode_slug]
      );
      let queueId;
      let merged = false;
      if (dup.length) {
        queueId = dup[0].id;
        merged = true;
      } else {
        const [mine] = await conn.query("SELECT COUNT(*) AS c FROM cinema_queue WHERE user_id = ? AND status = 'queued'", [userId]);
        if (Number(mine[0].c) >= MAX_QUEUED_PER_USER) {
          throw new WalletError(`Bạn đang có ${MAX_QUEUED_PER_USER} phim chờ chiếu. Đợi tới lượt hoặc huỷ bớt nhé!`);
        }
        const [ins] = await conn.query(
          `INSERT INTO cinema_queue (user_id, movie_slug, movie_name, movie_thumb, episode_slug, episode_name, total_bid, status, created_at_ms)
           VALUES (?, ?, ?, ?, ?, ?, 0, 'queued', ?)`,
          [userId, ep.movie_slug, ep.movie_name, ep.movie_thumb, ep.episode_slug, ep.episode_name, Date.now()]
        );
        queueId = ins.insertId;
      }
      await contribute(conn, userId, queueId, bid, ep.movie_name);
      await conn.commit();
      return { queueId, merged };
    } catch (e) {
      await conn.rollback().catch(() => {});
      throw e;
    } finally {
      conn.release();
    }
  });
  getNowPlaying().catch(() => {}); // đang chiếu phim tự chọn → chuyển ngay
  return result;
}

/** Góp thêm tiền cho 1 đề xuất đang chờ → tăng thứ hạng. */
export async function boostRequest(userId, queueId, rawAmount) {
  const amount = validBid(rawAmount);
  if (amount <= 0) throw new WalletError(`Góp tối thiểu ${MIN_BID.toLocaleString('vi-VN')}đ`);
  await ensureDatabaseSchema();
  return withLock(async () => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [q] = await conn.query('SELECT id, movie_name, status FROM cinema_queue WHERE id = ? FOR UPDATE', [queueId]);
      if (!q.length) throw new WalletError('Không tìm thấy đề xuất', 404);
      if (q[0].status !== 'queued') throw new WalletError('Phim này đã chiếu hoặc đã huỷ');
      await contribute(conn, userId, queueId, amount, q[0].movie_name);
      await conn.commit();
      return { ok: true };
    } catch (e) {
      await conn.rollback().catch(() => {});
      throw e;
    } finally {
      conn.release();
    }
  });
}

/** Người đề xuất huỷ khi chưa tới lượt → hoàn tiền cho tất cả người đã góp. */
export async function cancelRequest(userId, queueId) {
  await ensureDatabaseSchema();
  return withLock(async () => {
    const [q] = await pool.query('SELECT user_id, status FROM cinema_queue WHERE id = ?', [queueId]);
    if (!q.length) throw new WalletError('Không tìm thấy đề xuất', 404);
    if (Number(q[0].user_id) !== Number(userId)) throw new WalletError('Chỉ người đề xuất mới huỷ được', 403);
    if (q[0].status !== 'queued') throw new WalletError('Phim này đã chiếu hoặc đã huỷ');
    await refundQueue(queueId, 'người đề xuất huỷ');
    return { ok: true };
  });
}

/** Hàng chờ đã xếp hạng (kèm phần góp của người đang xem). */
export async function getQueue(viewerId) {
  await ensureDatabaseSchema();
  const [rows] = await pool.query(
    `SELECT q.id, q.user_id, q.movie_slug, q.movie_name, q.movie_thumb, q.episode_slug, q.episode_name, q.total_bid, q.created_at_ms,
            u.username AS requested_by,
            (SELECT COUNT(DISTINCT c.user_id) FROM cinema_contrib c WHERE c.queue_id = q.id) AS backers,
            (SELECT COALESCE(SUM(c2.amount), 0) FROM cinema_contrib c2 WHERE c2.queue_id = q.id AND c2.user_id = ?) AS my_amount
     FROM cinema_queue q LEFT JOIN users u ON u.id = q.user_id
     WHERE q.status = 'queued'
     ORDER BY q.total_bid DESC, q.created_at_ms ASC, q.id ASC
     LIMIT 50`,
    [viewerId || 0]
  );
  return rows.map((r, i) => ({
    rank: i + 1,
    id: r.id,
    movie_slug: r.movie_slug,
    movie_name: r.movie_name,
    movie_thumb: r.movie_thumb,
    episode_slug: r.episode_slug,
    episode_name: r.episode_name,
    total_bid: Number(r.total_bid),
    requested_by: r.requested_by || 'Ẩn danh',
    backers: Number(r.backers),
    my_amount: Number(r.my_amount),
    mine: viewerId ? Number(r.user_id) === Number(viewerId) : false,
  }));
}

export async function getRequesterName(queueId) {
  if (!queueId) return null;
  const [rows] = await pool.query(
    'SELECT u.username, q.total_bid FROM cinema_queue q LEFT JOIN users u ON u.id = q.user_id WHERE q.id = ?',
    [queueId]
  );
  return rows[0] ? { username: rows[0].username || 'Ẩn danh', total_bid: Number(rows[0].total_bid) } : null;
}
