const pool = require('../db');

// Get all users (Admin only)
const getAllUsers = async (req, res) => {
  try {
    // Don't return passwords in the response
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get user by ID (Admin only)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update user role (Admin only)
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['admin', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "admin" or "student"' });
    }
    
    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Don't allow demoting the last admin
    if (role === 'student') {
      const adminCount = await pool.query(
        'SELECT COUNT(*) FROM users WHERE role = $1 AND id != $2',
        ['admin', id]
      );
      
      if (parseInt(adminCount.rows[0].count) === 0) {
        return res.status(400).json({ 
          error: 'Cannot demote last admin. At least one admin must remain.' 
        });
      }
    }
    
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role',
      [role, id]
    );
    
    console.log(`✅ User role updated: ${result.rows[0].email} -> ${role}`);
    
    res.json({
      message: 'User role updated successfully',
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete user (Admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userCheck.rows[0];
    
    // Don't allow deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await pool.query(
        'SELECT COUNT(*) FROM users WHERE role = $1',
        ['admin']
      );
      
      if (parseInt(adminCount.rows[0].count) === 1) {
        return res.status(400).json({ 
          error: 'Cannot delete last admin. At least one admin must remain.' 
        });
      }
    }
    
    // Check if user has borrowed books
    const borrowedCheck = await pool.query(
      'SELECT * FROM borrow_records WHERE user_id = $1 AND return_date IS NULL',
      [id]
    );
    
    if (borrowedCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete user with borrowed books',
        borrowed_count: borrowedCheck.rows.length
      });
    }
    
    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    
    console.log(`🗑️ User deleted: ${user.email}`);
    
    res.json({
      message: 'User deleted successfully',
      deleted_user: user.email
    });
    
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users');
    const adminCount = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
    const studentCount = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
    
    res.json({
      total_users: parseInt(totalUsers.rows[0].count),
      admin_count: parseInt(adminCount.rows[0].count),
      student_count: parseInt(studentCount.rows[0].count)
    });
    
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getUserStats
};
