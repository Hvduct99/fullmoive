import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ensureDatabaseSchema, withSchemaRetry } from '@/lib/dbUtils';
import { createDeposit, confirmTransfer, walletErrorResponse, WalletError, buildPaymentInfo, normalizePhone } from '@/lib/wallet';
import { notifyAdmins } from '@/lib/adminNotify';
import { MIN_TOPUP, MAX_TOPUP } from '@/lib/membership';

export const dynamic = 'force-dynamic';

const vnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;

async function usernameOf(userId) {
  try {
    const [[u]] = await pool.query('SELECT username, phone FROM users WHERE id = ?', [userId]);
    return u || {};
  } catch {
    return {};
  }
}

// Tạo lệnh nạp tiền → trả về ảnh QR của tài khoản nhận + nội dung CK (SĐT)
export async function POST(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  let body = {};
  try {
    body = await request.json();
  } catch { /* body rỗng */ }
  const { amount, method, phone, action, id } = body;

  // Người nạp bấm "Tôi đã chuyển khoản" → báo admin duyệt
  if (action === 'confirm') {
    if (id) {
      try {
        const r = await withSchemaRetry(() => confirmTransfer(session.userId, Number(id)));
        return NextResponse.json({ ...r, message: 'Đã báo admin, tiền sẽ được cộng ngay khi duyệt' });
      } catch (e) {
        if (e instanceof WalletError) return walletErrorResponse(NextResponse, e, 'Lỗi báo chuyển khoản');
        // lỗi database → vẫn báo admin bên dưới
      }
    }
    // Đơn chưa ghi được vào hệ thống: vẫn báo admin đủ thông tin để đối chiếu ngân hàng
    const u = await usernameOf(session.userId);
    await notifyAdmins({
      type: 'deposit_confirmed',
      title: `${u.username || 'user #' + session.userId} báo đã chuyển ${vnd(amount)}`,
      body: `Số tiền: ${vnd(amount)}\nNội dung CK: ${normalizePhone(phone) || phone || u.phone || '(không rõ)'}\nTài khoản: ${u.username || session.userId}\n(Đơn chưa ghi được vào hệ thống — kiểm tra ngân hàng rồi cộng tiền thủ công ở Quản lý Users.)`,
      link: '/admin/billing',
    });
    return NextResponse.json({ status: 'pending', message: 'Đã báo admin, tiền sẽ được cộng ngay khi duyệt' });
  }

  try {
    const deposit = await withSchemaRetry(() => createDeposit(session.userId, amount, method || 'vietqr', phone));
    return NextResponse.json({ deposit });
  } catch (e) {
    // Lỗi do người dùng (số tiền sai, thiếu SĐT...) → báo lại để sửa
    if (e instanceof WalletError) return walletErrorResponse(NextResponse, e, 'Lỗi tạo lệnh nạp tiền');

    // Lỗi hệ thống / database: KHÔNG chặn người dùng — vẫn hiện QR + nội dung CK để chuyển khoản,
    // và báo admin để đối chiếu thủ công.
    console.error('createDeposit failed, falling back to plain QR:', e);
    const parsed = Math.round(Number(amount));
    if (!Number.isFinite(parsed) || parsed < MIN_TOPUP || parsed > MAX_TOPUP) {
      return walletErrorResponse(NextResponse, e, 'Lỗi tạo lệnh nạp tiền');
    }
    const u = await usernameOf(session.userId);
    const content = normalizePhone(u.phone) || normalizePhone(phone);
    if (!content) {
      return NextResponse.json({ message: 'Nhập số điện thoại để làm nội dung chuyển khoản', code: 'PHONE_REQUIRED' }, { status: 400 });
    }
    await notifyAdmins({
      type: 'deposit_new',
      title: `Đơn nạp mới: ${vnd(parsed)} từ ${u.username || 'user #' + session.userId}`,
      body: `Số tiền: ${vnd(parsed)}\nNội dung CK: ${content}\nTài khoản: ${u.username || session.userId}\n(Hệ thống chưa ghi được đơn: ${e.code || 'lỗi'} — đối chiếu ngân hàng rồi cộng tiền thủ công.)`,
      link: '/admin/billing',
    });
    return NextResponse.json({ deposit: { id: null, ...buildPaymentInfo('vietqr', parsed, content), fallback: true } });
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
