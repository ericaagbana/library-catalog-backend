// create-tables.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const SQL = `
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create books table
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    isbn VARCHAR(50) UNIQUE,
    description TEXT,
    category VARCHAR(100),
    copies INTEGER DEFAULT 1,
    available_copies INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create borrow_records table
CREATE TABLE IF NOT EXISTS borrow_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    book_id INTEGER REFERENCES books(id),
    borrow_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    return_date DATE,
    status VARCHAR(20) DEFAULT 'borrowed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample books
INSERT INTO books (title, author, isbn, description, category, copies, available_copies) VALUES
('Atomic Habits', 'James Clear', '9780735211292', 'A revolutionary guide to building good habits', 'Self-help', 5, 5),
('The Lean Startup', 'Eric Ries', '9780307887894', 'How to build a successful startup', 'Business', 3, 3),
('The Song of Achilles', 'Madeline Miller', '9780062060624', 'A retelling of the Trojan War', 'Fiction', 4, 4),
('The Judge''s List', 'John Grisham', '9780385546027', 'A legal thriller', 'Mystery', 2, 2),
('Taste: My Life Through Food', 'Stanley Tucci', '9781982168018', 'Memoir about food and life', 'Biography', 3, 3)
ON CONFLICT (isbn) DO NOTHING;
`;

async function setupDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔧 Creating database tables...');
    await client.query(SQL);
    console.log('✅ Database tables created successfully!');
    console.log('📚 Sample books inserted');
  } catch (err) {
    console.error('❌ Error creating tables:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

setupDatabase();