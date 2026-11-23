/**
 * Thông báo cho admin: lưu DB (chuông thông báo trên web) + gửi email nếu đã cấu hình SMTP.
 * Không bao giờ làm hỏng luồng chính: mọi lỗi chỉ ghi log.
 */
import nodemailer from 'nodemailer';
import pool from './db';
import { ensureDatabaseSchema } from './dbUtils';

let transporter = null;
function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: SMTP_SECURE === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

async function adminEmails() {
  const fromEnv = String(process.env.ADMIN_NOTIFY_EMAIL || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (fromEnv.length) return fromEnv;
  const [rows] = await pool.query("SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL AND email <> '' LIMIT 5");
  return rows.map((r) => r.email);
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function sendEmail(title, body, link) {
  const t = getTransporter();
  if (!t) return;
  const to = await adminEmails();
  if (!to.length) return;
  const site = process.env.SITE_URL || 'https://genzmovie.com';
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await t.sendMail({
    from: `"GenzMovie" <${from}>`,
    to: to.join(','),
    subject: `[GenzMovie] ${title}`,
    text: `${title}\n\n${body || ''}\n\n${link ? site + link : ''}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;background:#fafafa;border-radius:8px">
      <h2 style="color:#111;margin:0 0 12px">${esc(title)}</h2>
      <p style="white-space:pre-line;color:#333">${esc(body)}</p>
      ${link ? `<p><a href="${esc(site + link)}" style="display:inline-block;padding:10px 16px;background:#f5c518;color:#000;border-radius:6px;text-decoration:none;font-weight:bold">Mở trang duyệt</a></p>` : ''}
    </div>`,
  });
}

/**
 * @param {{type:string,title:string,body?:string,link?:string,txId?:number,email?:boolean}} n
 */
export async function notifyAdmins({ type, title, body = '', link = '/admin/billing', txId = null, email = true }) {
  try {
    await ensureDatabaseSchema();
    await pool.query(
      'INSERT INTO admin_notifications (type, title, body, link, tx_id, created_at_ms) VALUES (?, ?, ?, ?, ?, ?)',
      [type, String(title).slice(0, 255), String(body).slice(0, 1000), link, txId, Date.now()]
    );
  } catch (e) {
    console.error('notifyAdmins DB error:', e.message);
  }
  if (email) {
    sendEmail(title, body, link).catch((e) => console.error('notifyAdmins email error:', e.message));
  }
}

export async function listAdminNotifications(limit = 20) {
  await ensureDatabaseSchema();
  const [items] = await pool.query(
    'SELECT id, type, title, body, link, tx_id, is_read, created_at_ms FROM admin_notifications ORDER BY id DESC LIMIT ?',
    [limit]
  );
  const [[u]] = await pool.query('SELECT COUNT(*) AS n FROM admin_notifications WHERE is_read = 0');
  const [[p]] = await pool.query("SELECT COUNT(*) AS n FROM transactions WHERE type = 'deposit' AND status = 'pending'");
  return {
    unread: Number(u.n),
    pendingDeposits: Number(p.n),
    items: items.map((r) => ({ ...r, id: Number(r.id), is_read: !!r.is_read, created_at_ms: Number(r.created_at_ms) })),
  };
}

export async function markAdminNotificationsRead(id) {
  await ensureDatabaseSchema();
  if (id) await pool.query('UPDATE admin_notifications SET is_read = 1 WHERE id = ?', [Number(id)]);
  else await pool.query('UPDATE admin_notifications SET is_read = 1 WHERE is_read = 0');
}
