require('dotenv').config();
console.log('🔍 Testing FINAL database connection...');

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
    console.log('🎉 SUCCESS! Connected to database!');
    
    const result = await client.query('SELECT NOW()');
    console.log('⏰ Database time:', result.rows[0].now);
    
    // List existing tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n📊 Existing tables:');
    if (tables.rows.length === 0) {
      console.log('   No tables found (this is normal for new database)');
    } else {
      tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
    }
    
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

test();
