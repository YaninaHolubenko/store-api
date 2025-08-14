// models/user.js
const pool = require('../db/index');

/**
 * Find a user by username or email
 * @param {string} username
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function findByUsernameOrEmail(username, email) {
  const result = await pool.query(
    'SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $2',
    [username, email]
  );
  return result.rows[0] || null;
}

/**
 * Create a new user record
 * @param {{username: string, email: string, passwordHash: string}} data
 * @returns {Promise<object>}
 */
async function create({ username, email, passwordHash }) {
  const result = await pool.query(
    'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
    [username, email, passwordHash]
  );
  return result.rows[0];
}

/**
 * Find a user by ID
 */
async function findById(id) {
  const res = await pool.query(
    'SELECT id, username, email FROM users WHERE id = $1',
    [id]
  );
  return res.rows[0] || null;
}

/**
 * Update a user by ID
 */
async function updateById(id, { username, email, passwordHash }) {
  const res = await pool.query(
    `UPDATE users SET
       username = COALESCE($1, username),
       email = COALESCE($2, email),
       password_hash = COALESCE($3, password_hash)
     WHERE id = $4
     RETURNING id, username, email`,
    [username, email, passwordHash, id]
  );
  return res.rows[0] || null;
}

/**
 * Delete a user by ID 
 */
async function deleteById(id) {
  await pool.query('DELETE FROM users WHERE id = $1', [id]);
}

module.exports = {
  findByUsernameOrEmail,
  findById,
  create,
  updateById,
  deleteById
};