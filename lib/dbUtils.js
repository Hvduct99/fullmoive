import pool from './db';

let schemaReady = false;

export async function ensureDatabaseSchema() {
  if (schemaReady) return;
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS balance INT NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'`);
    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    schemaReady = true;
  } catch (e) {
    console.error('Schema migration error:', e.message);
  }
}
