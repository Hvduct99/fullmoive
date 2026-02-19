import mysql from 'mysql2/promise';

const dbConfig = {
  // Allow overriding host via environment variable, fallback to 127.0.0.1 if not set
  host: process.env.DB_HOST || '127.0.0.1', 
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
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
