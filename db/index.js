//index.js
require('dotenv').config();
// Import the Pool class from the 'pg' library to manage PostgreSQL database connections
const { Pool } = require('pg');

// Create a new connection pool to the PostgreSQL database
const pool = new Pool({
  user: process.env.PG_USER,        // from .env
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

module.exports = pool; // Export the pool to use it in other files
