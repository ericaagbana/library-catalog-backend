const { Pool } = require("pg");
require("dotenv").config();

// Create a PostgreSQL connection pool with SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Render PostgreSQL
    require: true // Force SSL
  }
});

// Test database connection
pool.on('connect', () => {
  console.log("✅ Connected to PostgreSQL database (SSL)");
});

pool.on('error', (err) => {
  console.error("❌ Database connection error:", err.message);
});

module.exports = pool;
