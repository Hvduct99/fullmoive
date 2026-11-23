import { randomBytes } from 'crypto';
import pool from './db';
import { ensureDatabaseSchema } from './dbUtils';
import { DAY_MS, getPlan, getFaction, MIN_TOPUP, MAX_TOPUP } from './membership';
import { notifyAdmins } from './adminNotify';

const vnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;

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
    // Mặc định: tài khoản nhận VietinBank (mã VietQR "ICB"), có thể ghi đè bằng biến môi trường
    bankId: process.env.VIETQR_BANK_ID || 'ICB',
    bankName: process.env.VIETQR_BANK_NAME || 'VietinBank',
    accountNo: process.env.VIETQR_ACCOUNT_NO || '104867035330',
    accountName: process.env.VIETQR_ACCOUNT_NAME || 'HOANG VAN DUC',
    momoPhone: process.env.MOMO_PHONE || '',
    zaloPayPhone: process.env.ZALOPAY_PHONE || '',
    autoConfirm: !!process.env.PAYMENT_WEBHOOK_KEY,
  };
}

// Ảnh QR tĩnh gốc của tài khoản nhận (dùng khi không tải được VietQR động)
export const STATIC_QR_URL = '/images/qr-vietinbank.jpg';

/** Chuẩn hoá SĐT Việt Nam về dạng 0xxxxxxxxx (10 số). Không hợp lệ → ''. */
export function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('84')) d = '0' + d.slice(2);
  if (d.length === 9 && /^[35789]/.test(d)) d = '0' + d;
  return /^0[35789]\d{8}$/.test(d) ? d : '';
}

/** Tìm user theo SĐT đã chuẩn hoá (so khớp sau khi chuẩn hoá cả dữ liệu cũ trong DB). */
export async function findUsersByPhone(phone, conn = pool) {
  const norm = normalizePhone(phone);
  if (!norm) return [];
  const [rows] = await conn.query(
    "SELECT id, phone FROM users WHERE phone LIKE ? AND status <> 'banned'",
    [`%${norm.slice(-9).split('').join('%')}%`]
  );
  return rows.filter((r) => normalizePhone(r.phone) === norm);
}

export function buildPaymentInfo(method, amount, transferContent) {
  const cfg = getPaymentConfig();
  // Ảnh QR gốc của tài khoản nhận (VietinBank). Người chuyển nhập số tiền + nội dung (SĐT) theo hướng dẫn.
  // App ngân hàng / MoMo / ZaloPay đều quét được mã này.
  const qrUrl = STATIC_QR_URL;
  const phone = method === 'momo' ? cfg.momoPhone : method === 'zalopay' ? cfg.zaloPayPhone : '';
  return {
    method,
    qrUrl,
    staticQrUrl: STATIC_QR_URL,
    dynamicQr: false,
    bank: cfg.bankName,
    accountNo: cfg.accountNo,
    accountName: cfg.accountName,
    phone,
    amount,
    code: transferContent, // nội dung chuyển khoản = SĐT của tài khoản
    autoConfirm: cfg.autoConfirm,
  };
}

/** SĐT dùng làm nội dung chuyển khoản. Chưa có → lưu SĐT người dùng nhập (không trùng tài khoản khác). */
async function resolveTransferPhone(userId, phoneInput) {
  const [rows] = await pool.query('SELECT phone FROM users WHERE id = ?', [userId]);
  if (!rows.length) throw new WalletError('Tài khoản không tồn tại', 404);
  const current = normalizePhone(rows[0].phone);
  if (current) return current;

  const input = normalizePhone(phoneInput);
  if (!input) {
    throw new WalletError(
      phoneInput ? 'Số điện thoại không hợp lệ (VD: 0968635701)' : 'Nhập số điện thoại để làm nội dung chuyển khoản',
      400,
      'PHONE_REQUIRED'
    );
  }
  const owners = (await findUsersByPhone(input)).filter((u) => u.id !== userId);
  if (owners.length) throw new WalletError('Số điện thoại này đã thuộc tài khoản khác', 409, 'PHONE_TAKEN');
  await pool.query('UPDATE users SET phone = ? WHERE id = ?', [input, userId]);
  return input;
}

/** Tạo lệnh nạp (pending). Nội dung chuyển khoản = SĐT của tài khoản. */
export async function createDeposit(userId, amount, method, phoneInput) {
  const parsed = Math.round(Number(amount));
  if (!Number.isFinite(parsed) || parsed < MIN_TOPUP || parsed > MAX_TOPUP) {
    throw new WalletError(`Số tiền phải từ ${MIN_TOPUP.toLocaleString('vi-VN')}đ đến ${MAX_TOPUP.toLocaleString('vi-VN')}đ`);
  }
  if (!['vietqr', 'momo', 'zalopay'].includes(method)) throw new WalletError('Phương thức không hợp lệ');

  await ensureDatabaseSchema();
  const phone = await resolveTransferPhone(userId, phoneInput);

  // Tái sử dụng lệnh pending cùng số tiền + phương thức trong 30 phút gần nhất (tránh spam lệnh)
  const [existing] = await pool.query(
    `SELECT id, created_at FROM transactions
     WHERE user_id = ? AND type = 'deposit' AND status = 'pending' AND amount = ? AND method = ? AND code IS NOT NULL
     ORDER BY id DESC LIMIT 1`,
    [userId, parsed, method]
  );
  if (existing.length && Date.now() - new Date(existing[0].created_at).getTime() < 30 * 60 * 1000) {
    return { id: existing[0].id, ...buildPaymentInfo(method, parsed, phone) };
  }

  for (let i = 0; i < 5; i++) {
    const code = makeCode(userId); // mã nội bộ duy nhất (không cần người dùng gõ)
    try {
      const [res] = await pool.query(
        "INSERT INTO transactions (user_id, amount, type, status, note, code, method) VALUES (?, ?, 'deposit', 'pending', ?, ?, ?)",
        [userId, parsed, `CK nội dung: ${phone}`, code, method]
      );
      // Báo admin có đơn nạp mới
      const [[u]] = await pool.query('SELECT username FROM users WHERE id = ?', [userId]);
      await notifyAdmins({
        type: 'deposit_new',
        title: `Đơn nạp mới: ${vnd(parsed)} từ ${u?.username || 'user #' + userId}`,
        body: `Mã đơn #${res.insertId}
Số tiền: ${vnd(parsed)}
Nội dung CK: ${phone}
Tài khoản: ${u?.username || userId}`,
        txId: res.insertId,
      });
      return { id: res.insertId, ...buildPaymentInfo(method, parsed, phone) };
    } catch (e) {
      if (e.code !== 'ER_DUP_ENTRY') throw e;
    }
  }
  throw new WalletError('Không tạo được lệnh nạp, thử lại nhé', 500);
}

/**
 * Webhook: tiền về có SĐT trong nội dung → cộng cho đúng tài khoản sở hữu SĐT.
 *  - Có lệnh pending (số tiền <= tiền nhận) → hoàn tất lệnh gần số tiền nhất.
 *  - Không có lệnh → vẫn cộng (người dùng quét QR tĩnh) nếu có mã giao dịch ngân hàng để chống cộng lặp.
 * Trùng SĐT giữa nhiều tài khoản → không tự cộng, để admin xử lý.
 */
export async function creditByPhone({ phone, received, gatewayRef }) {
  await ensureDatabaseSchema();
  const users = await findUsersByPhone(phone);
  if (users.length !== 1) return { processed: false, reason: users.length ? 'ambiguous_phone' : 'phone_not_found' };
  const userId = users[0].id;

  const [pending] = await pool.query(
    `SELECT id FROM transactions
     WHERE user_id = ? AND type = 'deposit' AND status = 'pending' AND amount <= ?
     ORDER BY (? - amount) ASC, id DESC LIMIT 1`,
    [userId, received, received]
  );
  if (pending.length) {
    const r = await completeDeposit(pending[0].id, { creditAmount: received, gatewayRef });
    if (!r.alreadyProcessed) {
      await notifyAdmins({ type: 'deposit_auto', title: `Tiền về tự động: +${vnd(received)} (SĐT ${normalizePhone(phone)})`, body: `Đã tự cộng vào đơn #${pending[0].id}.`, txId: pending[0].id, email: false });
    }
    return { processed: !r.alreadyProcessed, userId, txId: pending[0].id };
  }

  if (!gatewayRef) return { processed: false, reason: 'no_order_no_ref' };
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [res] = await conn.query(
      "INSERT INTO transactions (user_id, amount, type, status, note, method, gateway_ref) VALUES (?, ?, 'deposit', 'completed', ?, 'vietqr', ?)",
      [userId, received, `Tự động cộng · CK nội dung: ${normalizePhone(phone)}`, gatewayRef]
    );
    await conn.query('UPDATE users SET balance = COALESCE(balance, 0) + ? WHERE id = ?', [received, userId]);
    await conn.commit();
    await notifyAdmins({ type: 'deposit_auto', title: `Tiền về tự động: +${vnd(received)} (SĐT ${normalizePhone(phone)})`, body: 'Không có đơn nạp trước — đã tự tạo giao dịch và cộng tiền.', txId: res.insertId, email: false });
    return { processed: true, userId, txId: res.insertId };
  } catch (e) {
    await conn.rollback().catch(() => {});
    if (e.code === 'ER_DUP_ENTRY') return { processed: false, reason: 'duplicate' };
    throw e;
  } finally {
    conn.release();
  }
}

/** Đã xử lý giao dịch ngân hàng này chưa (chống webhook gửi lặp). */
export async function gatewayRefUsed(ref) {
  if (!ref) return false;
  const [rows] = await pool.query('SELECT 1 FROM transactions WHERE gateway_ref = ? LIMIT 1', [ref]);
  return rows.length > 0;
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
  // Kèm mã lỗi (VD: ER_NO_SUCH_TABLE) để chẩn đoán nhanh — không kèm câu SQL hay dữ liệu
  const dbCode = e && typeof e.code === 'string' ? e.code : null;
  // Thiếu cột: ghi rõ tên cột để sửa nhanh (chỉ tên cột, không lộ dữ liệu)
  const col = dbCode === 'ER_BAD_FIELD_ERROR' ? (String(e.message || '').match(/Unknown column '([^']+)'/) || [])[1] : null;
  const detail = col ? `${dbCode}: thiếu cột ${col}` : dbCode;
  return NextResponse.json({ message: detail ? `${fallback} (${detail})` : fallback, errorCode: dbCode }, { status: 500 });
}

/**
 * Người nạp bấm "Tôi đã chuyển khoản" → ghi nhận + báo admin để duyệt ngay (chỉ báo 1 lần / đơn).
 */
export async function confirmTransfer(userId, txId) {
  await ensureDatabaseSchema();
  const [rows] = await pool.query(
    "SELECT t.id, t.amount, t.status, t.user_confirmed_at, u.username, u.phone FROM transactions t JOIN users u ON u.id = t.user_id WHERE t.id = ? AND t.user_id = ? AND t.type = 'deposit'",
    [txId, userId]
  );
  if (!rows.length) throw new WalletError('Không tìm thấy đơn nạp', 404);
  const tx = rows[0];
  if (tx.status !== 'pending') return { status: tx.status, already: true };
  const [u] = await pool.query('UPDATE transactions SET user_confirmed_at = ? WHERE id = ? AND user_confirmed_at IS NULL', [Date.now(), txId]);
  if (u.affectedRows) {
    await notifyAdmins({
      type: 'deposit_confirmed',
      title: `${tx.username} báo đã chuyển ${vnd(tx.amount)}`,
      body: `Mã đơn #${tx.id}
Số tiền: ${vnd(tx.amount)}
Nội dung CK: ${normalizePhone(tx.phone) || tx.phone || '(chưa có SĐT)'}
Kiểm tra tài khoản ngân hàng rồi bấm Duyệt.`,
      txId: tx.id,
    });
  }
  return { status: 'pending', already: !u.affectedRows };
}
