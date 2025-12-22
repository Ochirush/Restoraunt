const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'restsystem',
  password: process.env.DB_PASSWORD || '12345',
  port: process.env.DB_PORT || 5432,
});
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('✅ Успешное подключение к базе данных');
    }
});
module.exports = pool;