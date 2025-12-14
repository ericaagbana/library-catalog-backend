const pool = require('../db');

// Borrow a book
const borrowBook = async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;
    
    console.log(`📚 Borrow request: User ${userId}, Book ${bookId}`);
    
    // Check if book exists and is available
    const bookResult = await pool.query(
      'SELECT * FROM books WHERE id = $1 AND available_copies > 0',
      [bookId]
    );
    
    if (bookResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Book not available for borrowing. Either not found or no copies available.' 
      });
    }
    
    const book = bookResult.rows[0];
    
    // Check if user already borrowed this book and hasn't returned it
    const existingBorrow = await pool.query(
      `SELECT * FROM borrow_records 
       WHERE user_id = $1 AND book_id = $2 AND return_date IS NULL`,
      [userId, bookId]
    );
    
    if (existingBorrow.rows.length > 0) {
      return res.status(400).json({ 
        error: 'You have already borrowed this book and not returned it yet.' 
      });
    }
    
    // Calculate due date (14 days from today)
    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    
    // Start transaction
    await pool.query('BEGIN');
    
    try {
      // Create borrow record
      const borrowResult = await pool.query(
        `INSERT INTO borrow_records 
         (user_id, book_id, borrow_date, due_date, status) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [userId, bookId, borrowDate, dueDate, 'borrowed']
      );
      
      // Update available copies
      await pool.query(
        'UPDATE books SET available_copies = available_copies - 1 WHERE id = $1',
        [bookId]
      );
      
      await pool.query('COMMIT');
      
      const borrowRecord = borrowResult.rows[0];
      
      res.status(201).json({
        message: 'Book borrowed successfully!',
        borrow_record: {
          id: borrowRecord.id,
          book_id: borrowRecord.book_id,
          borrow_date: borrowRecord.borrow_date,
          due_date: borrowRecord.due_date,
          status: borrowRecord.status
        },
        book: {
          title: book.title,
          author: book.author,
          available_copies: book.available_copies - 1
        },
        reminder: `Please return by ${dueDate.toLocaleDateString()} (14 days from now)`
      });
      
    } catch (transactionError) {
      await pool.query('ROLLBACK');
      throw transactionError;
    }
    
  } catch (error) {
    console.error('❌ Borrow error:', error.message);
    res.status(500).json({ 
      error: 'Server error during borrowing: ' + error.message 
    });
  }
};

// Return a book
const returnBook = async (req, res) => {
  try {
    const { borrowId } = req.params;
    const userId = req.user.id;
    
    console.log(`🔄 Return request: Borrow ID ${borrowId}, User ${userId}`);
    
    // Find borrow record
    const borrowResult = await pool.query(
      `SELECT br.*, b.title, b.id as book_id 
       FROM borrow_records br
       JOIN books b ON br.book_id = b.id
       WHERE br.id = $1 AND br.user_id = $2 AND br.return_date IS NULL`,
      [borrowId, userId]
    );
    
    if (borrowResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Borrow record not found, already returned, or does not belong to you.' 
      });
    }
    
    const borrowRecord = borrowResult.rows[0];
    
    // Calculate fine if overdue (simple: $1 per day overdue)
    const returnDate = new Date();
    const dueDate = new Date(borrowRecord.due_date);
    let fineAmount = 0;
    let fineMessage = '';
    
    if (returnDate > dueDate) {
      const overdueDays = Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24));
      fineAmount = overdueDays * 1.00; // $1 per day
      fineMessage = `Overdue by ${overdueDays} days. Fine: $${fineAmount.toFixed(2)}`;
    }
    
    // Start transaction
    await pool.query('BEGIN');
    
    try {
      // Update borrow record
      const updateResult = await pool.query(
        `UPDATE borrow_records 
         SET return_date = $1, status = 'returned', 
             fine_amount = $2, fine_paid = $3
         WHERE id = $4 
         RETURNING *`,
        [returnDate, fineAmount, fineAmount === 0, borrowId]
      );
      
      // Update available copies
      await pool.query(
        'UPDATE books SET available_copies = available_copies + 1 WHERE id = $1',
        [borrowRecord.book_id]
      );
      
      await pool.query('COMMIT');
      
      const updatedRecord = updateResult.rows[0];
      
      res.json({
        message: 'Book returned successfully!',
        return_details: {
          book_title: borrowRecord.title,
          return_date: updatedRecord.return_date,
          fine_amount: updatedRecord.fine_amount,
          fine_paid: updatedRecord.fine_paid,
          status: updatedRecord.status
        },
        fine_message: fineMessage || 'No fine - returned on time!'
      });
      
    } catch (transactionError) {
      await pool.query('ROLLBACK');
      throw transactionError;
    }
    
  } catch (error) {
    console.error('❌ Return error:', error.message);
    res.status(500).json({ 
      error: 'Server error during return: ' + error.message 
    });
  }
};

// Get user's borrowed books
const getMyBorrowedBooks = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT 
        br.id as borrow_id,
        br.borrow_date,
        br.due_date,
        br.return_date,
        br.status,
        br.fine_amount,
        br.fine_paid,
        b.id as book_id,
        b.title,
        b.author,
        b.category,
        b.isbn,
        CASE 
          WHEN br.return_date IS NOT NULL THEN 'returned'
          WHEN br.due_date < CURRENT_DATE THEN 'overdue'
          ELSE 'borrowed'
        END as current_status,
        CASE 
          WHEN br.due_date < CURRENT_DATE AND br.return_date IS NULL 
          THEN CEIL((CURRENT_DATE - br.due_date) * 1.00)
          ELSE 0
        END as calculated_fine
       FROM borrow_records br
       JOIN books b ON br.book_id = b.id
       WHERE br.user_id = $1
       ORDER BY br.borrow_date DESC`,
      [userId]
    );
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Get borrowed books error:', error.message);
    res.status(500).json({ 
      error: 'Server error: ' + error.message 
    });
  }
};

// Get all borrow records (Admin only)
const getAllBorrowRecords = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        br.*,
        b.title as book_title,
        b.author as book_author,
        u.email as user_email,
        u.name as user_name,
        CASE 
          WHEN br.return_date IS NOT NULL THEN 'returned'
          WHEN br.due_date < CURRENT_DATE THEN 'overdue'
          ELSE 'active'
        END as current_status
       FROM borrow_records br
       JOIN books b ON br.book_id = b.id
       JOIN users u ON br.user_id = u.id
       ORDER BY br.borrow_date DESC`
    );
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Get all borrow records error:', error.message);
    res.status(500).json({ 
      error: 'Server error: ' + error.message 
    });
  }
};

// Get borrowing statistics
const getBorrowStats = async (req, res) => {
  try {
    const activeBorrows = await pool.query(
      "SELECT COUNT(*) as count FROM borrow_records WHERE return_date IS NULL"
    );
    
    const overdueBorrows = await pool.query(
      `SELECT COUNT(*) as count FROM borrow_records 
       WHERE return_date IS NULL AND due_date < CURRENT_DATE`
    );
    
    const totalFines = await pool.query(
      "SELECT SUM(fine_amount) as total FROM borrow_records WHERE fine_paid = false"
    );
    
    res.json({
      active_borrows: parseInt(activeBorrows.rows[0].count),
      overdue_borrows: parseInt(overdueBorrows.rows[0].count),
      total_fines: parseFloat(totalFines.rows[0].total || 0),
      average_borrow_duration: '14 days'
    });
    
  } catch (error) {
    console.error('❌ Borrow stats error:', error.message);
    res.status(500).json({ 
      error: 'Server error: ' + error.message 
    });
  }
};

module.exports = { 
  borrowBook, 
  returnBook, 
  getMyBorrowedBooks, 
  getAllBorrowRecords,
  getBorrowStats
};
