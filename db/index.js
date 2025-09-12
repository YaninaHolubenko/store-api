// db/index.js
require('dotenv').config();
const { Pool } = require('pg');

// Prefer a single DATABASE_URL when available; fall back to discrete PG_* vars
const {
  DATABASE_URL,
  PG_USER,
  PG_HOST,
  PG_DATABASE,
  PG_PASSWORD,
  PG_PORT,
  NODE_ENV,
} = process.env;

const IS_PROD = NODE_ENV === 'production';

const pool = new Pool(
  DATABASE_URL
    ? {
        connectionString: DATABASE_URL,
        // Many managed Postgres providers require SSL in production
        ssl: IS_PROD ? { rejectUnauthorized: false } : false,
      }
    : {
        user: PG_USER,
        host: PG_HOST,
        database: PG_DATABASE,
        password: PG_PASSWORD,
        port: PG_PORT ? Number(PG_PORT) : undefined,
      }
);

module.exports = pool; // Export the pool to use it in other files
