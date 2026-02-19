import mysql from 'mysql2/promise';

const dbConfig = {
  // Force 127.0.0.1 to avoid IPv6 (::1) issues on Hostinger
  host: '127.0.0.1', 
  user: process.env.DB_USER || 'u103991645_fullmovie',
  password: process.env.DB_PASSWORD || 'Hocvadop99*',
  database: process.env.DB_NAME || 'u103991645_fullmovie',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// Log connection config (safe version)
console.log('Database Config:', {
    host: dbConfig.host, 
    user: dbConfig.user, 
    database: dbConfig.database 
});

const pool = mysql.createPool(dbConfig);

export default pool;
