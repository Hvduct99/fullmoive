import mysql from 'mysql2/promise';

const dbConfig = {
  // Hardcoded as requested
  host: '127.0.0.1', 
  user: 'u103991645_fullmovie', // Replace with your real DB user if needed
  password: 'Hocvadop99*', // Replace with your real DB password if needed
  database: 'u103991645_fullmovie', // Replace with your real DB name if needed
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
