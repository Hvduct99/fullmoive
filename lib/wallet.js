import { randomBytes } from 'crypto';
import pool from './db';
import { ensureDatabaseSchema } from './dbUtils';
import { DAY_MS, getPlan, getFaction, MIN_TOPUP, MAX_TOPUP } from './membership';

export class WalletError extends Error {
  constructor(message, status = 400, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Trường user an toàn để trả về client. */
export function publicUser(u) {
  return {
    id: u.id,
    username: u.username || '',
    email: u.email || '',
    full_name: u.full_name || '',
    phone: u.phone || '',
    avatar: u.avatar || '',
    role: u.role || 'user',
    balance: Number(u.balance || 0),
    faction: u.faction === 'girlz' ? 'girlz' : 'boiz',
    pass_expires_at: u.pass_expires_at ? new Date(u.pass_expires_at).toISOString() : null,
    pass_total_days: Number(u.pass_total_days || 0),
    created_at: u.created_at ? new Date(u.created_at).toISOString() : null,
  };
}

export async function getUserById(userId) {
  await ensureDatabaseSchema();
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  return rows[0] || null;
}

/**
 * Mua / gia hạn Pass bằng số dư ví. Toàn bộ trong 1 transaction có khóa dòng
 * để không bị trừ tiền 2 lần khi bấm liên tục.
 * Thời hạn được tính trong JS (không dùng NOW() của MySQL) để tránh lệch múi giờ.
 */
export async function buyPassWithBalance(userId, planId) {
  const plan = getPlan(planId);
  if (!plan) throw new WalletError('Gói không hợp lệ');

  await ensureDatabaseSchema();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      'SELECT id, balance, faction, pass_expires_at, pass_total_days FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    if (!rows.length) throw new WalletError('Tài khoản không tồn tại', 404);
    const u = rows[0];
    const balance = Number(u.balance || 0);
    if (balance < plan.price) {
      throw new WalletError('Số dư không đủ, bơm thêm xu nhé!', 402, 'INSUFFICIENT_BALANCE');
    }

    const now = Date.now();
    const currentExp = u.pass_expires_at ? new Date(u.pass_expires_at).getTime() : 0;
    const newExp = new Date(Math.max(currentExp, now) + plan.days * DAY_MS);

    await conn.query(
      'UPDATE users SET balance = balance - ?, pass_expires_at = ?, pass_total_days = pass_total_days + ? WHERE id = ?',
      [plan.price, newExp, plan.days, userId]
    );
    await conn.query(
      "INSERT INTO transactions (user_id, amount, type, status, note, method) VALUES (?, ?, 'pass', 'completed', ?, 'wallet')",
      [userId, -plan.price, `${getFaction(u.faction).pass} · ${plan.label}`]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }
  return publicUser(await getUserById(userId));
}

function makeCode(userId) {
  // Chỉ chữ + số để ngân hàng không cắt bỏ ký tự
  return `GZ${userId}${randomBytes(4).toString('hex').toUpperCase().slice(0, 6)}`;
}

export function getPaymentConfig() {
  return {
    bankId: process.env.VIETQR_BANK_ID || '',
    accountNo: process.env.VIETQR_ACCOUNT_NO || '',
    accountName: process.env.VIETQR_ACCOUNT_NAME || '',
    momoPhone: process.env.MOMO_PHONE || '',
    zaloPayPhone: process.env.ZALOPAY_PHONE || '',
    autoConfirm: !!process.env.PAYMENT_WEBHOOK_KEY,
  };
}

export function buildPaymentInfo(method, amount, code) {
  const cfg = getPaymentConfig();
  const dynamicQr = !!(cfg.bankId && cfg.accountNo);
  // VietQR động (có sẵn số tiền + nội dung). MoMo / ZaloPay cũng quét được mã này.
  const qrUrl = dynamicQr
    ? `https://img.vietqr.io/image/${encodeURIComponent(cfg.bankId)}-${encodeURIComponent(cfg.accountNo)}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(cfg.accountName)}`
    : '/images/QR.jpg';
  const phone = method === 'momo' ? cfg.momoPhone : method === 'zalopay' ? cfg.zaloPayPhone : '';
  return {
    method,
    qrUrl,
    dynamicQr,
    bank: cfg.bankId,
    accountNo: cfg.accountNo,
    accountName: cfg.accountName,
    phone,
    amount,
    code,
    autoConfirm: cfg.autoConfirm,
  };
}

/** Tạo lệnh nạp (pending) với mã nội dung chuyển khoản duy nhất. */
export async function createDeposit(userId, amount, method) {
  const parsed = Math.round(Number(amount));
  if (!Number.isFinite(parsed) || parsed < MIN_TOPUP || parsed > MAX_TOPUP) {
    throw new WalletError(`Số tiền phải từ ${MIN_TOPUP.toLocaleString('vi-VN')}đ đến ${MAX_TOPUP.toLocaleString('vi-VN')}đ`);
  }
  if (!['vietqr', 'momo', 'zalopay'].includes(method)) throw new WalletError('Phương thức không hợp lệ');

  await ensureDatabaseSchema();

  // Tái sử dụng lệnh pending cùng số tiền + phương thức trong 30 phút gần nhất (tránh spam lệnh)
  const [existing] = await pool.query(
    `SELECT id, code, created_at FROM transactions
     WHERE user_id = ? AND type = 'deposit' AND status = 'pending' AND amount = ? AND method = ? AND code IS NOT NULL
     ORDER BY id DESC LIMIT 1`,
    [userId, parsed, method]
  );
  if (existing.length && Date.now() - new Date(existing[0].created_at).getTime() < 30 * 60 * 1000) {
    return { id: existing[0].id, ...buildPaymentInfo(method, parsed, existing[0].code) };
  }

  for (let i = 0; i < 5; i++) {
    const code = makeCode(userId);
    try {
      const [res] = await pool.query(
        "INSERT INTO transactions (user_id, amount, type, status, note, code, method) VALUES (?, ?, 'deposit', 'pending', ?, ?, ?)",
        [userId, parsed, code, code, method]
      );
      return { id: res.insertId, ...buildPaymentInfo(method, parsed, code) };
    } catch (e) {
      if (e.code !== 'ER_DUP_ENTRY') throw e;
    }
  }
  throw new WalletError('Không tạo được mã nạp, thử lại nhé', 500);
}

/**
 * Hoàn tất lệnh nạp: đổi trạng thái + cộng tiền, nguyên tử & idempotent.
 * @param {object} opts.creditAmount  số tiền thực nhận (webhook); mặc định = số tiền lệnh
 */
export async function completeDeposit(txId, { creditAmount, gatewayRef } = {}) {
  await ensureDatabaseSchema();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      "SELECT id, user_id, amount, status, type FROM transactions WHERE id = ? FOR UPDATE",
      [txId]
    );
    if (!rows.length) throw new WalletError('Không tìm thấy giao dịch', 404);
    const tx = rows[0];
    if (tx.type !== 'deposit') throw new WalletError('Không phải giao dịch nạp tiền');
    if (tx.status !== 'pending') {
      await conn.rollback();
      return { alreadyProcessed: true, userId: tx.user_id, amount: Number(tx.amount) };
    }
    const amount = creditAmount ? Math.round(Number(creditAmount)) : Number(tx.amount);
    await conn.query(
      "UPDATE transactions SET status = 'completed', amount = ?, gateway_ref = COALESCE(?, gateway_ref) WHERE id = ?",
      [amount, gatewayRef || null, txId]
    );
    await conn.query('UPDATE users SET balance = COALESCE(balance, 0) + ? WHERE id = ?', [amount, tx.user_id]);
    await conn.commit();
    return { alreadyProcessed: false, userId: tx.user_id, amount };
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }
}

export function walletErrorResponse(NextResponse, e, fallback = 'Có lỗi xảy ra') {
  if (e instanceof WalletError) {
    return NextResponse.json({ message: e.message, code: e.code }, { status: e.status });
  }
  console.error(fallback, e);
  return NextResponse.json({ message: fallback }, { status: 500 });
}
