import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'u103991645_fullmovie',
  password: process.env.DB_PASSWORD || 'Hocvadop99*',
  database: process.env.DB_NAME || 'u103991645_fullmovie',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  // Add these lines to help with connection issues on some hosting providers
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
