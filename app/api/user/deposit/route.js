import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema, withSchemaRetry } from '@/lib/dbUtils';
import { createDeposit, confirmTransfer, walletErrorResponse } from '@/lib/wallet';

export const dynamic = 'force-dynamic';

// Tạo lệnh nạp tiền → trả về thông tin VietQR / MoMo / ZaloPay kèm mã nội dung CK
export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const { amount, method, phone, action, id } = await request.json();
    // Người nạp bấm "Tôi đã chuyển khoản" → báo admin duyệt
    if (action === 'confirm') {
      const r = await withSchemaRetry(() => confirmTransfer(session.userId, Number(id)));
      return NextResponse.json({ ...r, message: 'Đã báo admin, tiền sẽ được cộng ngay khi duyệt' });
    }
    const deposit = await withSchemaRetry(() => createDeposit(session.userId, amount, method || 'vietqr', phone));
    return NextResponse.json({ deposit });
  } catch (e) {
    return walletErrorResponse(NextResponse, e, 'Lỗi tạo lệnh nạp tiền');
  }
}

// Poll trạng thái lệnh nạp (client gọi mỗi 5 giây)
export async function GET(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await ensureDatabaseSchema();
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

    const [rows] = await pool.query(
      "SELECT id, amount, status FROM transactions WHERE id = ? AND user_id = ? AND type = 'deposit'",
      [id, session.userId]
    );
    if (!rows.length) return NextResponse.json({ message: 'Không tìm thấy' }, { status: 404 });

    const [u] = await pool.query('SELECT balance FROM users WHERE id = ?', [session.userId]);
    return NextResponse.json(
      { status: rows[0].status, amount: Number(rows[0].amount), balance: Number(u[0]?.balance || 0) },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
    );
  } catch (e) {
    return walletErrorResponse(NextResponse, e, 'Lỗi kiểm tra lệnh nạp');
  }
}
