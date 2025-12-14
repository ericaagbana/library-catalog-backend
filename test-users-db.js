require('dotenv').config();
const pool = require('./db');

async function test() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking users table...');
    
    // Check table structure
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Users table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Check user count
    const count = await client.query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Total users: ${count.rows[0].count}`);
    
    // List all users
    const users = await client.query('SELECT id, email, name, role FROM users ORDER BY id');
    console.log('📋 All users:');
    users.rows.forEach(user => {
      console.log(`  - ${user.id}: ${user.email} (${user.name || 'no name'}) [${user.role}]`);
    });
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

test();
