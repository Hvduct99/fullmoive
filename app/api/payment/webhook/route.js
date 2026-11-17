import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import pool from '@/lib/db';
import { ensureDatabaseSchema } from '@/lib/dbUtils';
import { completeDeposit } from '@/lib/wallet';

export const dynamic = 'force-dynamic';

/**
 * Webhook nhận biến động số dư ngân hàng (định dạng SePay — sepay.vn).
 * Cấu hình trên SePay: URL = https://<domain>/api/payment/webhook,
 * kiểu xác thực "API Key", key = PAYMENT_WEBHOOK_KEY.
 * Tiền được cộng tự động khi nội dung CK chứa mã GZxxxx và số tiền >= số tiền lệnh.
 */
function authorized(request) {
  const key = process.env.PAYMENT_WEBHOOK_KEY;
  if (!key) return false;
  const header = request.headers.get('authorization') || '';
  const given = header.replace(/^(Apikey|Bearer)\s+/i, '').trim();
  const a = Buffer.from(given);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request) {
  if (!authorized(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  if (body.transferType && body.transferType !== 'in') {
    return NextResponse.json({ success: true, message: 'Ignored (outgoing)' });
  }

  const text = `${body.code || ''} ${body.content || ''} ${body.description || ''}`.toUpperCase();
  const match = text.match(/GZ\d+[A-F0-9]{6}/);
  const received = Math.round(Number(body.transferAmount || 0));
  if (!match || !received) {
    return NextResponse.json({ success: true, message: 'No matching code' });
  }

  try {
    await ensureDatabaseSchema();
    const [rows] = await pool.query(
      "SELECT id, amount FROM transactions WHERE code = ? AND type = 'deposit' LIMIT 1",
      [match[0]]
    );
    if (!rows.length) return NextResponse.json({ success: true, message: 'Code not found' });
    if (received < Number(rows[0].amount)) {
      // Chuyển thiếu: để admin xử lý tay
      return NextResponse.json({ success: true, message: 'Amount lower than order, left pending' });
    }
    const result = await completeDeposit(rows[0].id, {
      creditAmount: received,
      gatewayRef: String(body.referenceCode || body.id || '').slice(0, 100) || null,
    });
    return NextResponse.json({ success: true, processed: !result.alreadyProcessed });
  } catch (e) {
    console.error('Payment webhook error:', e);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
