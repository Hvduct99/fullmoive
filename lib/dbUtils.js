import pool from './db';

let schemaReady = false;
let schemaPromise = null;
let lastFailAt = 0;
const RETRY_MS = 60 * 1000;

const col = (table, column, def) => ({ addColumn: [table, column, def] });
const uniqueIndex = (table, index, column) => ({ addUniqueIndex: [table, index, column] });

// Mỗi bước chạy độc lập: một bước lỗi không chặn các bước sau.
// Không dùng "ADD COLUMN IF NOT EXISTS" (MySQL 8 không hỗ trợ) → kiểm tra information_schema.
const MIGRATIONS = [
  col('users', 'balance', 'INT NOT NULL DEFAULT 0'),
  col('users', 'status', "VARCHAR(20) NOT NULL DEFAULT 'active'"),
  col('users', 'full_name', 'VARCHAR(255) DEFAULT NULL'),
  col('users', 'phone', 'VARCHAR(50) DEFAULT NULL'),
  // Hệ phái + hội viên
  col('users', 'faction', "VARCHAR(10) NOT NULL DEFAULT 'boiz'"),
  col('users', 'pass_expires_at', 'DATETIME DEFAULT NULL'),
  col('users', 'pass_total_days', 'INT NOT NULL DEFAULT 0'),
  `
  CREATE TABLE IF NOT EXISTS transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    amount INT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'deposit',
    status ENUM('pending','completed','rejected') NOT NULL DEFAULT 'pending',
    note TEXT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX(user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  col('transactions', 'code', 'VARCHAR(32) DEFAULT NULL'),
  col('transactions', 'method', 'VARCHAR(20) DEFAULT NULL'),
  col('transactions', 'gateway_ref', 'VARCHAR(100) DEFAULT NULL'),
  uniqueIndex('transactions', 'uniq_tx_code', 'code'),
  // Mỗi giao dịch ngân hàng chỉ được cộng tiền 1 lần (chống webhook gửi lặp)
  uniqueIndex('transactions', 'uniq_tx_gateway_ref', 'gateway_ref'),
  `
  CREATE TABLE IF NOT EXISTS comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    movie_slug VARCHAR(255) NULL,
    content TEXT NOT NULL,
    rating TINYINT NULL,
    status ENUM('visible','hidden') NOT NULL DEFAULT 'visible',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX(user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS email_verifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    payload JSON NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX(email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS watch_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    movie_slug VARCHAR(255) NOT NULL,
    movie_name VARCHAR(500) NOT NULL,
    movie_thumb VARCHAR(500) DEFAULT NULL,
    movie_year VARCHAR(10) DEFAULT NULL,
    episode_slug VARCHAR(255) DEFAULT NULL,
    episode_name VARCHAR(255) DEFAULT NULL,
    watched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX(user_id),
    UNIQUE KEY unique_user_movie (user_id, movie_slug),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  col('watch_history', 'progress', 'TINYINT UNSIGNED DEFAULT NULL'),
  col('watch_history', 'episode_index', 'INT DEFAULT NULL'),
  col('watch_history', 'episode_total', 'INT DEFAULT NULL'),
  `
  CREATE TABLE IF NOT EXISTS user_sessions (
    sid CHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    user_agent VARCHAR(500) DEFAULT NULL,
    ip VARCHAR(64) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX(user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS user_library (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    list ENUM('saved','favorite') NOT NULL,
    movie_slug VARCHAR(255) NOT NULL,
    movie_name VARCHAR(500) NOT NULL,
    movie_thumb VARCHAR(500) DEFAULT NULL,
    movie_year VARCHAR(10) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_list_movie (user_id, list, movie_slug),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS watch_parties (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(12) NOT NULL,
    host_id INT NOT NULL,
    title VARCHAR(120) NOT NULL,
    movie_slug VARCHAR(255) NOT NULL,
    movie_name VARCHAR(500) NOT NULL,
    movie_thumb VARCHAR(500) DEFAULT NULL,
    episode_slug VARCHAR(255) DEFAULT NULL,
    starts_at DATETIME DEFAULT NULL,
    status ENUM('open','closed') NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_party_code (code),
    INDEX(host_id),
    FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS watch_party_members (
    party_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (party_id, user_id),
    INDEX(user_id),
    FOREIGN KEY (party_id) REFERENCES watch_parties(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS watch_party_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    party_id INT NOT NULL,
    user_id INT NOT NULL,
    content VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX(party_id, id),
    FOREIGN KEY (party_id) REFERENCES watch_parties(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  // ===== Rạp Chung (kênh chiếu 24/7 + hàng chờ đề xuất có ưu tiên theo tiền) =====
  // Không dùng khoá ngoại: tránh lỗi lệch kiểu cột users.id giữa các database.
  `
  CREATE TABLE IF NOT EXISTS cinema_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    movie_slug VARCHAR(255) NOT NULL,
    movie_name VARCHAR(500) NOT NULL,
    movie_thumb VARCHAR(500) DEFAULT NULL,
    episode_slug VARCHAR(255) NOT NULL,
    episode_name VARCHAR(255) DEFAULT NULL,
    total_bid INT NOT NULL DEFAULT 0,
    status ENUM('queued','playing','played','refunded') NOT NULL DEFAULT 'queued',
    created_at_ms BIGINT NOT NULL,
    played_at_ms BIGINT DEFAULT NULL,
    INDEX idx_cq_status_rank (status, total_bid, created_at_ms),
    INDEX idx_cq_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS cinema_contrib (
    id INT PRIMARY KEY AUTO_INCREMENT,
    queue_id INT NOT NULL,
    user_id INT NOT NULL,
    amount INT NOT NULL DEFAULT 0,
    refunded TINYINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cc_queue (queue_id),
    INDEX idx_cc_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `
  CREATE TABLE IF NOT EXISTS cinema_state (
    id TINYINT PRIMARY KEY,
    queue_id INT DEFAULT NULL,
    movie_slug VARCHAR(255) NOT NULL,
    movie_name VARCHAR(500) NOT NULL,
    movie_thumb VARCHAR(500) DEFAULT NULL,
    episode_slug VARCHAR(255) DEFAULT NULL,
    episode_name VARCHAR(255) DEFAULT NULL,
    m3u8 VARCHAR(1000) NOT NULL,
    duration_ms BIGINT NOT NULL,
    started_at_ms BIGINT NOT NULL,
    recent_auto TEXT DEFAULT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  // 1 = thời lượng chính xác (đọc playlist hoặc trình duyệt đã báo); 0 = đang tạm dùng thời lượng ghi trên phim
  col('cinema_state', 'duration_confirmed', 'TINYINT NOT NULL DEFAULT 1'),
  col('cinema_state', 'estimate_ms', 'BIGINT NOT NULL DEFAULT 0'),
  // Kênh chat Rạp Chung
  `
  CREATE TABLE IF NOT EXISTS cinema_chat (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    username VARCHAR(100) NOT NULL,
    faction VARCHAR(10) NOT NULL DEFAULT 'boiz',
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    content VARCHAR(300) NOT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    created_at_ms BIGINT NOT NULL,
    INDEX idx_chat_id_deleted (deleted, id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  // Lượt đề xuất miễn phí: mỗi người 1 lượt / ngày (giờ Việt Nam). UNIQUE chặn dùng 2 lần kể cả bấm song song.
  `
  CREATE TABLE IF NOT EXISTS cinema_free_usage (
    user_id INT NOT NULL,
    day_key INT NOT NULL,
    queue_id INT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, day_key),
    INDEX idx_free_queue (queue_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

const CONNECTION_ERRORS = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST', 'ENOTFOUND', 'ER_ACCESS_DENIED_ERROR']);

async function columnExists(table, column) {
  const [rows] = await pool.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
    [table, column]
  );
  return rows.length > 0;
}

async function indexExists(table, index) {
  const [rows] = await pool.query(
    'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
    [table, index]
  );
  return rows.length > 0;
}

// Lỗi MySQL/MariaDB khi khoá ngoại không tương thích (kiểu cột khác nhau, engine khác...)
const FK_ERRORS = new Set(['ER_CANT_CREATE_TABLE', 'ER_CANNOT_ADD_FOREIGN', 'ER_FK_INCOMPATIBLE_COLUMNS', 'ER_CANT_CREATE_TABLE_FK', 'ER_FK_COLUMN_NOT_NULL']);
const FK_ERRNOS = new Set([150, 1005, 1215, 3780, 1822]);

// Kiểu cột users.id THẬT trên database (VD: "int(11)", "int(10) unsigned", "bigint(20) unsigned").
// Cột user_id/host_id của bảng mới phải cùng kiểu thì khoá ngoại mới tạo được.
let userIdType = 'INT';
async function detectUserIdType() {
  try {
    const [rows] = await pool.query(
      "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id' LIMIT 1"
    );
    const t = String(rows[0]?.COLUMN_TYPE || '').toLowerCase();
    if (/^(tiny|small|medium|big)?int(\(\d+\))?( unsigned)?( zerofill)?$/.test(t)) userIdType = t.replace(/\(\d+\)/, '').toUpperCase();
  } catch (e) {
    console.error('detectUserIdType error:', e.message);
  }
}

function adaptDdl(sql) {
  return sql.replace(/\b(user_id|host_id) INT NOT NULL/g, `$1 ${userIdType} NOT NULL`);
}

function stripForeignKeys(sql) {
  return sql
    .split('\n')
    .filter((line) => !/^\s*FOREIGN KEY/i.test(line))
    .join('\n')
    .replace(/,(\s*\)\s*ENGINE)/i, '$1');
}

export const schemaStatus = { userIdType: null, errors: [], fkFallback: [], ranAt: null };

async function runStep(step) {
  if (typeof step === 'string') {
    const ddl = adaptDdl(step);
    try {
      await pool.query(ddl);
    } catch (e) {
      // Khoá ngoại không tạo được → vẫn tạo bảng (không khoá ngoại) để tính năng chạy được
      if (!FK_ERRORS.has(e.code) && !FK_ERRNOS.has(e.errno)) throw e;
      const name = (ddl.match(/CREATE TABLE IF NOT EXISTS (\w+)/i) || [])[1] || '?';
      console.warn(`Schema: tạo bảng ${name} không kèm khoá ngoại (${e.code})`);
      schemaStatus.fkFallback.push(name);
      await pool.query(stripForeignKeys(ddl));
    }
    return;
  }
  if (step.addColumn) {
    const [table, column, def] = step.addColumn;
    if (!(await columnExists(table, column))) {
      await pool.query('ALTER TABLE `' + table + '` ADD COLUMN `' + column + '` ' + def);
    }
    return;
  }
  if (step.addUniqueIndex) {
    const [table, index, column] = step.addUniqueIndex;
    if (!(await indexExists(table, index))) {
      await pool.query('ALTER TABLE `' + table + '` ADD UNIQUE INDEX `' + index + '` (`' + column + '`)');
    }
  }
}

async function runMigrations() {
  schemaStatus.errors = [];
  schemaStatus.fkFallback = [];
  await detectUserIdType();
  schemaStatus.userIdType = userIdType;
  for (const step of MIGRATIONS) {
    try {
      await runStep(step);
    } catch (e) {
      // Mất kết nối → dừng, lần sau thử lại. Lỗi SQL khác → ghi log và đi tiếp.
      if (CONNECTION_ERRORS.has(e.code)) throw e;
      console.error('Schema migration error:', e.code, e.message);
      const label = typeof step === 'string' ? (step.match(/CREATE TABLE IF NOT EXISTS (\w+)/i) || [])[1] : JSON.stringify(step);
      schemaStatus.errors.push({ step: label, code: e.code, message: String(e.message).slice(0, 300) });
    }
  }
  schemaStatus.ranAt = new Date().toISOString();
}

export async function ensureDatabaseSchema() {
  if (schemaReady) return;
  if (Date.now() - lastFailAt < RETRY_MS) return;
  if (!schemaPromise) {
    schemaPromise = runMigrations()
      .then(() => { schemaReady = true; })
      .catch((e) => {
        lastFailAt = Date.now();
        console.error('Schema migration aborted:', e.message);
      })
      .finally(() => { schemaPromise = null; });
  }
  await schemaPromise;
}
