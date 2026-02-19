import mysql from 'mysql2/promise';

const dbConfig = {
  // Hardcoded as requested
  host: '127.0.0.1', 
  user: 'root', // Replace with your real DB user if needed
  password: 'your_password_here', // Replace with your real DB password if needed
  database: 'movie_db', // Replace with your real DB name if needed
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
