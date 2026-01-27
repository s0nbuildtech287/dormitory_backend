const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dormitory_system',
    max: 10, // Maximum number of clients in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection
pool.connect()
    .then(client => {
        console.log('✅ PostgreSQL Database connected successfully');
        client.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
    });

// Export query method for easier use
pool.query = (text, params) => pool.query(text, params);

module.exports = pool;
