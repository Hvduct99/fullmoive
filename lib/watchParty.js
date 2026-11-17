import { randomBytes } from 'crypto';
import pool from './db';
import { ensureDatabaseSchema } from './dbUtils';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ONLINE_WINDOW_MS = 30 * 1000;

export function makePartyCode() {
  const bytes = randomBytes(6);
  let s = '';
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
}

export function normalizeCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

export async function getPartyByCode(code) {
  await ensureDatabaseSchema();
  const [rows] = await pool.query(
    `SELECT p.*, u.username AS host_name, u.avatar AS host_avatar
     FROM watch_parties p JOIN users u ON u.id = p.host_id WHERE p.code = ? LIMIT 1`,
    [normalizeCode(code)]
  );
  return rows[0] || null;
}

export function publicParty(p) {
  return {
    id: p.id,
    code: p.code,
    title: p.title,
    host_id: p.host_id,
    host_name: p.host_name,
    movie_slug: p.movie_slug,
    movie_name: p.movie_name,
    movie_thumb: p.movie_thumb,
    episode_slug: p.episode_slug,
    starts_at: p.starts_at ? new Date(p.starts_at).toISOString() : null,
    status: p.status,
    created_at: p.created_at,
  };
}
