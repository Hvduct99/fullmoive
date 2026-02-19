import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'movie_db',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
};

// Log connection attempt (hiding password)
console.log('Initializing DB connection with:', {
    ...dbConfig,
    password: dbConfig.password ? '******' : '(empty)'
});

const pool = mysql.createPool(dbConfig);

// Test connection immediately
pool.getConnection()
    .then(conn => {
        console.log('Database connected successfully');
        conn.release();
    })
    .catch(err => {
        console.error('Database connection failed:', err.message);
    });

export default pool;
