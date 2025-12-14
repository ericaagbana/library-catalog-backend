require('dotenv').config();
const pool = require('./db');

async function updateSchema() {
  const client = await pool.connect();
  try {
    console.log('🔧 Checking/updating borrow_records table...');
    
    // Add columns if they don't exist
    const updates = [
      // Make sure we have all necessary columns
      `ALTER TABLE borrow_records 
       ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT (CURRENT_DATE + INTERVAL '14 days')`,
      
      `ALTER TABLE borrow_records 
       ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'borrowed'`,
       
      `ALTER TABLE borrow_records 
       ADD COLUMN IF NOT EXISTS fine_amount DECIMAL(10,2) DEFAULT 0`,
       
      `ALTER TABLE borrow_records 
       ADD COLUMN IF NOT EXISTS fine_paid BOOLEAN DEFAULT false`
    ];
    
    for (const update of updates) {
      try {
        await client.query(update);
        console.log('✅ Schema update applied');
      } catch (err) {
        console.log('Note:', err.message);
      }
    }
    
    console.log('✅ Borrow table schema is up to date');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

updateSchema();
