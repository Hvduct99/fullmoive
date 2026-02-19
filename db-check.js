// db-check.js - Run this on server with "node db-check.js" to test connection
const mysql = require('mysql2/promise');
require('dotenv').config();

// Explicitly log what we are trying to connect with
const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    // Do NOT log password
    database: process.env.DB_NAME
};

console.log('Testing connection with:', config);

async function testConnection() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        console.log('✅ Connection Sucessful!');
        await connection.end();
    } catch (error) {
        console.error('❌ Connection Failed:', error.message);
        console.error('Error Code:', error.code);
    }
}

testConnection();