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

async function runStep(step) {
  if (typeof step === 'string') {
    await pool.query(step);
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
  for (const step of MIGRATIONS) {
    try {
      await runStep(step);
    } catch (e) {
      // Mất kết nối → dừng, lần sau thử lại. Lỗi SQL khác → ghi log và đi tiếp.
      if (CONNECTION_ERRORS.has(e.code)) throw e;
      console.error('Schema migration error:', e.code, e.message);
    }
  }
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
