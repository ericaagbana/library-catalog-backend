require('dotenv').config();
const pool = require('./db');

async function test() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking borrow records...');
    
    const borrows = await client.query('SELECT * FROM borrow_records');
    console.log(`📊 Borrow records found: ${borrows.rows.length}`);
    
    if (borrows.rows.length > 0) {
      console.log('📖 Borrow records:');
      borrows.rows.forEach(record => {
        console.log(`  - ID: ${record.id}, User: ${record.user_id}, Book: ${record.book_id}, Status: ${record.status}`);
      });
    }
    
    // Check books
    const books = await client.query('SELECT id, title, available_copies FROM books');
    console.log('\n📚 Books status:');
    books.rows.forEach(book => {
      console.log(`  - ${book.title}: ${book.available_copies} available copies`);
    });
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

test();
