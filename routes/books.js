const express = require('express');
const router = express.Router();
const {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  getBookStats
} = require('../controllers/bookController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getAllBooks);
router.get('/:id', getBookById);
router.get('/stats/overview', getBookStats);

// Admin only routes (protected)
router.post('/', authenticateToken, isAdmin, createBook);
router.put('/:id', authenticateToken, isAdmin, updateBook);
router.delete('/:id', authenticateToken, isAdmin, deleteBook);

module.exports = router;
