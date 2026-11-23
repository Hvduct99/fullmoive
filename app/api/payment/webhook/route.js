import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import pool from '@/lib/db';
import { ensureDatabaseSchema } from '@/lib/dbUtils';
import { completeDeposit, creditByPhone, gatewayRefUsed, normalizePhone } from '@/lib/wallet';

export const dynamic = 'force-dynamic';

/**
 * Webhook nhận biến động số dư ngân hàng (định dạng SePay — sepay.vn).
 * Cấu hình trên SePay: URL = https://<domain>/api/payment/webhook,
 * kiểu xác thực "API Key", key = PAYMENT_WEBHOOK_KEY.
 *
 * Nội dung chuyển khoản = SĐT của tài khoản → cộng tiền đúng người.
 * (Vẫn hỗ trợ mã cũ dạng GZxxxx cho các lệnh tạo trước đây.)
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

/** Lấy các SĐT có thể có trong nội dung CK (chịu được dấu cách/chấm chen giữa). */
function extractPhones(text) {
  const found = new Set();
  const scan = (s) => {
    for (const run of s.match(/\d+/g) || []) {
      if (run.length === 10 || (run.length === 11 && run.startsWith('84'))) {
        const p = normalizePhone(run);
        if (p) found.add(p);
      }
    }
  };
  scan(text);
  if (!found.size) scan(text.replace(/(\d)[\s.\-](?=\d)/g, '$1'));
  return [...found];
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

  const received = Math.round(Number(body.transferAmount || 0));
  if (!received || received <= 0) return NextResponse.json({ success: true, message: 'No amount' });

  // Mã định danh giao dịch ngân hàng (chống cộng lặp khi SePay gửi lại)
  const gatewayRef = (body.id ? `sepay:${body.id}` : String(body.referenceCode || '')).slice(0, 100) || null;
  const rawText = `${body.code || ''} ${body.content || ''} ${body.description || ''}`;

  try {
    await ensureDatabaseSchema();
    if (await gatewayRefUsed(gatewayRef)) {
      return NextResponse.json({ success: true, processed: false, message: 'Duplicate' });
    }

    // 1) Mã cũ GZxxxx
    const legacy = rawText.toUpperCase().match(/GZ\d+[A-F0-9]{6}/);
    if (legacy) {
      const [rows] = await pool.query("SELECT id, amount FROM transactions WHERE code = ? AND type = 'deposit' LIMIT 1", [legacy[0]]);
      if (rows.length && received >= Number(rows[0].amount)) {
        const r = await completeDeposit(rows[0].id, { creditAmount: received, gatewayRef });
        return NextResponse.json({ success: true, processed: !r.alreadyProcessed });
      }
    }

    // 2) SĐT trong nội dung
    for (const phone of extractPhones(rawText)) {
      const r = await creditByPhone({ phone, received, gatewayRef });
      if (r.processed) return NextResponse.json({ success: true, processed: true });
      if (r.reason === 'duplicate') return NextResponse.json({ success: true, processed: false, message: 'Duplicate' });
    }

    return NextResponse.json({ success: true, processed: false, message: 'No matching account' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return NextResponse.json({ success: true, processed: false, message: 'Duplicate' });
    console.error('Payment webhook error:', e);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
