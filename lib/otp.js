import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from './db';

const OTP_TTL_MIN = 10;

export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

export async function storePendingRegistration({ email, code, payload }) {
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
  await pool.query('DELETE FROM email_verifications WHERE email = ?', [email]);
  await pool.query(
    'INSERT INTO email_verifications (email, code_hash, payload, expires_at) VALUES (?, ?, ?, ?)',
    [email, codeHash, JSON.stringify(payload), expiresAt]
  );
}

export async function consumePendingRegistration({ email, code }) {
  const [rows] = await pool.query(
    'SELECT id, code_hash, payload, expires_at FROM email_verifications WHERE email = ? ORDER BY id DESC LIMIT 1',
    [email]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await pool.query('DELETE FROM email_verifications WHERE id = ?', [row.id]);
    return null;
  }
  const ok = await bcrypt.compare(code, row.code_hash);
  if (!ok) return null;
  await pool.query('DELETE FROM email_verifications WHERE id = ?', [row.id]);
  return typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
}
