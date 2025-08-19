// models/category.js
const pool = require('../db/index');

/**
 * Get all categories
 * @returns {Promise<Array<{id:number,name:string}>>}
 */
async function getAll() {
  const res = await pool.query(
    'SELECT id, name FROM categories ORDER BY name ASC'
  );
  return res.rows;
}

/**
 * Get a single category by id
 * @param {number} id
 * @returns {Promise<{id:number,name:string}|null>}
 */
async function getById(id) {
  const res = await pool.query(
    'SELECT id, name FROM categories WHERE id = $1',
    [id]
  );
  return res.rows[0] || null;
}

/**
 * Create a new category
 * @param {{name:string}} payload
 * @returns {Promise<{id:number,name:string}>}
 */
async function create(payload) {
  const { name } = payload;
  const res = await pool.query(
    'INSERT INTO categories (name) VALUES ($1) RETURNING id, name',
    [name]
  );
  return res.rows[0];
}

/**
 * Update category by id
 * @param {number} id
 * @param {{name?: string}} payload
 * @returns {Promise<{id:number,name:string}|null>}
 */
async function update(id, payload) {
  const { name } = payload;
  const res = await pool.query(
    `UPDATE categories
     SET name = COALESCE($1, name)
     WHERE id = $2
     RETURNING id, name`,
    [name ?? null, id]
  );
  return res.rows[0] || null;
}

/**
 * Remove category by id
 * @param {number} id
 * @returns {Promise<boolean>} true if a row was deleted
 */
async function remove(id) {
  const res = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
  return res.rowCount > 0;
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
