require('dotenv').config();
console.log('🔍 Testing NEW database connection...');
console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 80) + '...');

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  let client;
  try {
    console.log('🔄 Attempting to connect...');
    client = await pool.connect();
    console.log('✅ Connected to database!');
    
    const result = await client.query('SELECT NOW()');
    console.log('⏰ Database time:', result.rows[0].now);
    
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

test();
