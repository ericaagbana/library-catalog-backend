const pool = require('../db');

// Get all books
const getAllBooks = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM books ORDER BY title");
    res.json(result.rows);
  } catch (error) {
    console.error('Books error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Get single book
const getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM books WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Book error:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Create book (Admin only)
const createBook = async (req, res) => {
  try {
    console.log('📚 Creating new book:', req.body);
    
    const { title, author, isbn, description, category, copies, available_copies } = req.body;
    
    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }
    
    const result = await pool.query(
      `INSERT INTO books (title, author, isbn, description, category, copies, available_copies)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        title, 
        author, 
        isbn || null, 
        description || '', 
        category || 'General',
        copies || 1,
        available_copies || copies || 1
      ]
    );
    
    console.log('✅ Book created:', result.rows[0].title);
    
    res.status(201).json({
      message: 'Book created successfully',
      book: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Create book error:', error.message);
    
    // Handle duplicate ISBN
    if (error.code === '23505' && error.constraint.includes('isbn')) {
      return res.status(400).json({ error: 'Book with this ISBN already exists' });
    }
    
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

// Update book (Admin only)
const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, isbn, description, category, copies, available_copies } = req.body;
    
    // Check if book exists
    const bookCheck = await pool.query("SELECT * FROM books WHERE id = $1", [id]);
    if (bookCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    const result = await pool.query(
      `UPDATE books 
       SET title = $1, author = $2, isbn = $3, description = $4, 
           category = $5, copies = $6, available_copies = $7
       WHERE id = $8
       RETURNING *`,
      [
        title || bookCheck.rows[0].title,
        author || bookCheck.rows[0].author,
        isbn || bookCheck.rows[0].isbn,
        description || bookCheck.rows[0].description,
        category || bookCheck.rows[0].category,
        copies || bookCheck.rows[0].copies,
        available_copies !== undefined ? available_copies : bookCheck.rows[0].available_copies,
        id
      ]
    );
    
    console.log('✅ Book updated:', result.rows[0].title);
    
    res.json({
      message: 'Book updated successfully',
      book: result.rows[0]
    });
    
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete book (Admin only)
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if book exists
    const bookCheck = await pool.query("SELECT * FROM books WHERE id = $1", [id]);
    if (bookCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    // Check if book is currently borrowed
    const borrowedCheck = await pool.query(
      "SELECT * FROM borrow_records WHERE book_id = $1 AND return_date IS NULL",
      [id]
    );
    
    if (borrowedCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete book that is currently borrowed',
        borrowed_count: borrowedCheck.rows.length
      });
    }
    
    // Delete the book
    await pool.query("DELETE FROM books WHERE id = $1", [id]);
    
    console.log('🗑️ Book deleted:', bookCheck.rows[0].title);
    
    res.json({
      message: 'Book deleted successfully',
      deleted_book: bookCheck.rows[0].title
    });
    
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get book statistics
const getBookStats = async (req, res) => {
  try {
    const totalBooks = await pool.query("SELECT COUNT(*) as count FROM books");
    const availableBooks = await pool.query("SELECT SUM(available_copies) as total FROM books");
    const totalUsers = await pool.query("SELECT COUNT(*) as count FROM users");
    const activeBorrows = await pool.query("SELECT COUNT(*) as count FROM borrow_records WHERE return_date IS NULL");
    
    res.json({
      total_books: parseInt(totalBooks.rows[0].count),
      available_books: parseInt(availableBooks.rows[0].total || 0),
      total_users: parseInt(totalUsers.rows[0].count),
      active_borrows: parseInt(activeBorrows.rows[0].count)
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  getBookStats
};
