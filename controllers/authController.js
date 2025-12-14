const jwt = require('jsonwebtoken');
const pool = require('../db');

// Simple registration
const register = async (req, res) => {
  try {
    console.log('📝 Registration attempt:', req.body);
    
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Determine role: admin if email contains "admin", otherwise student
    const role = email.includes('admin') ? 'admin' : 'student';
    
    // Simple password storage (for testing)
    const hashedPassword = password;
    
    // Create user
    const newUser = await pool.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, name || email.split('@')[0], role]
    );
    
    // Create JWT token
    const token = jwt.sign(
      { 
        id: newUser.rows[0].id, 
        email: newUser.rows[0].email,
        role: newUser.rows[0].role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log(`✅ User registered: ${newUser.rows[0].email} (${role})`);
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: newUser.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

// Login function (same as before)
const login = async (req, res) => {
  try {
    console.log('🔐 Login attempt:', req.body.email);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userResult.rows[0];
    
    // Simple password check
    if (password !== user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return user info
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    
    console.log(`✅ User logged in: ${user.email} (${user.role})`);
    
    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });
    
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const userResult = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(userResult.rows[0]);
    
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { register, login, getProfile };
