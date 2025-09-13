// Create (or promote) an admin user using DATABASE_URL on Render.
require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin_user';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminStrongPass123!'; 

(async () => {
  // Hash the password
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // Connect to Render Postgres
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // Upsert by email: create if missing, otherwise promote to admin
  const sql = `
    INSERT INTO users (username, email, password_hash, role)
    VALUES ($1, $2, $3, 'admin')
    ON CONFLICT (email)
    DO UPDATE SET role = 'admin'
    RETURNING id, username, email, role, created_at;
  `;
  const vals = [ADMIN_USERNAME, ADMIN_EMAIL, passwordHash];

  const { rows } = await client.query(sql, vals);
  console.log('[admin] ensured:', rows[0]);

  await client.end();
  process.exit(0);
})().catch((err) => {
  console.error('[admin] failed:', err);
  process.exit(1);
});
