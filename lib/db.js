import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'u103991645_fullmovie',
  password: 'Hocvadop99*',
  database: 'u103991645_fullmovie',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

const pool = mysql.createPool(dbConfig);

export default pool;
