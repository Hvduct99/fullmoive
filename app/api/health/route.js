import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema, schemaStatus } from '@/lib/dbUtils';

export const dynamic = 'force-dynamic';

// Thông tin chẩn đoán realtime (không chứa đường dẫn hay dữ liệu nhạy cảm)
function diag(s) {
  if (!s) return { instrumentation: 'not-run' };
  return { instrumentation: 'ran', tries: s.tries, coreFound: s.coreFound, serverFound: s.serverFound, standalone: s.standalone, error: s.error, startedAt: s.startedAt };
}

const REQUIRED_TABLES = ['users', 'transactions', 'watch_history', 'user_sessions', 'user_library', 'watch_parties', 'watch_party_members', 'watch_party_messages', 'comments'];

/**
 * Chẩn đoán nhanh trên server thật: /api/health
 * - Ai cũng xem được: realtime có chạy không.
 * - Đã đăng nhập: thêm trạng thái database (bảng thiếu, mã lỗi migration). Không lộ dữ liệu người dùng.
 */
export async function GET() {
  const party = globalThis.__watchParty;
  const out = {
    ok: true,
    realtime: party
      ? { enabled: true, mode: globalThis.__watchPartyMode || 'unknown', ...party.stats() }
      : { enabled: false, diagnostics: diag(globalThis.__watchPartyStatus) },
    time: new Date().toISOString(),
  };

  // Tình trạng cập nhật database (công khai: chỉ tên bảng/cột + mã lỗi, không có dữ liệu hay thông tin đăng nhập)
  try {
    await ensureDatabaseSchema();
  } catch { /* bỏ qua */ }
  out.schema = {
    ranAt: schemaStatus.ranAt,
    runs: schemaStatus.runs || 0,
    usersIdType: schemaStatus.userIdType,
    missingColumns: schemaStatus.missingColumns || [],
    errors: (schemaStatus.errors || []).map((e) => ({ step: e.step, code: e.code })),
    lastRuntimeError: schemaStatus.lastRuntimeError ? { code: schemaStatus.lastRuntimeError.code, at: schemaStatus.lastRuntimeError.at } : null,
  };

  const session = await getSession();
  if (!session) return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });

  try {
    await ensureDatabaseSchema();
    const [rows] = await pool.query(
      `SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${REQUIRED_TABLES.map(() => '?').join(',')})`,
      REQUIRED_TABLES
    );
    const have = new Set(rows.map((r) => r.t));
    const [ver] = await pool.query('SELECT VERSION() AS v');
    out.database = {
      connected: true,
      version: ver[0]?.v,
      usersIdType: schemaStatus.userIdType,
      missingTables: REQUIRED_TABLES.filter((t) => !have.has(t)),
      createdWithoutForeignKey: schemaStatus.fkFallback,
      migrationErrors: schemaStatus.errors.map((e) => ({ step: e.step, code: e.code, message: e.message })),
      migratedAt: schemaStatus.ranAt,
    };
  } catch (e) {
    out.ok = false;
    out.database = { connected: false, code: e.code || null, message: String(e.message || '').slice(0, 200) };
  }
  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
