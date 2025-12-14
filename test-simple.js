require('dotenv').config();
console.log('🔍 Testing database connection...');
console.log('DATABASE_URL exists?', !!process.env.DATABASE_URL);
console.log('DATABASE_URL first 50 chars:', process.env.DATABASE_URL?.substring(0, 50) + '...');

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
    
    // Simple query
    const result = await client.query('SELECT NOW()');
    console.log('⏰ Database time:', result.rows[0].now);
    
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    console.error('Full error:', err);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

test();
