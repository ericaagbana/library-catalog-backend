const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./db"); // Import pool from db.js

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require("./routes/auth");
const bookRoutes = require("./routes/books");
const borrowRoutes = require("./routes/borrow");
const userRoutes = require("./routes/users");

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/borrow", borrowRoutes);
app.use("/api/users", userRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({ 
    message: "Digital Library Backend is running!",
    status: "online",
    endpoints: {
      auth: "/api/auth",
      books: "/api/books",
      borrow: "/api/borrow",
      users: "/api/users",
      health: "/api/health",
      stats: "/api/books/stats/overview"
    }
  });
});

// Books endpoint (public)
app.get("/api/books", async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT * FROM books ORDER BY title");
    client.release();
    res.json(result.rows);
  } catch (err) {
    console.error("Books query error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const client = await pool.connect();
    const dbResult = await client.query("SELECT NOW()");
    client.release();
    
    res.json({
      status: "healthy",
      database: "connected",
      time: dbResult.rows[0].now,
      message: "All systems operational"
    });
  } catch (err) {
    res.json({
      status: "degraded",
      database: "error",
      error: err.message
    });
  }
});

// Create default admin user if not exists
async function createDefaultAdmin() {
  try {
    const client = await pool.connect();
    
    // Check if admin exists
    const adminCheck = await client.query(
      "SELECT * FROM users WHERE email = $1",
      [process.env.ADMIN_EMAIL || 'admin@library.com']
    );
    
    if (adminCheck.rows.length === 0) {
      console.log("👑 Creating default admin user...");
      // Simple password (in production, use bcrypt!)
      const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
      await client.query(
        "INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)",
        [process.env.ADMIN_EMAIL || 'admin@library.com', 
         adminPass, 
         'Library Admin', 
         'admin']
      );
      console.log("✅ Default admin user created");
    } else {
      console.log("👑 Admin user already exists");
    }
    
    client.release();
  } catch (err) {
    console.log("⚠️  Could not check/create admin user:", err.message);
  }
}

// PORT
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Home: http://localhost:${PORT}`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
  console.log(`📚 Books: http://localhost:${PORT}/api/books`);
  console.log(`👥 Users: http://localhost:${PORT}/api/users (admin only)`);
  console.log(`🩺 Health: http://localhost:${PORT}/api/health`);
  
  // Create default admin on startup
  createDefaultAdmin();
});
