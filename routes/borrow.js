const express = require('express');
const router = express.Router();
const {
  borrowBook,
  returnBook,
  getMyBorrowedBooks,
  getAllBorrowRecords
} = require('../controllers/borrowController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// All borrow routes require authentication
router.use(authenticateToken);

// User routes
router.post('/:bookId', borrowBook);
router.post('/return/:borrowId', returnBook);
router.get('/my-books', getMyBorrowedBooks);

// Admin routes (protected)
router.get('/all', isAdmin, getAllBorrowRecords);

module.exports = router;
