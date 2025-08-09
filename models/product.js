// models/product.js

const pool = require('../db/index');

// Data access methods for products
async function getAll() {
  const result = await pool.query('SELECT * FROM products');
  return result.rows;
}

async function getById(id) {
  const result = await pool.query(
    'SELECT * FROM products WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function create({ name, description, price, stock, image_url }) {
  const result = await pool.query(
    'INSERT INTO products (name, description, price, stock, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [name, description, price, stock, image_url]
  );
  return result.rows[0];
}

async function update(id, { name, description, price, stock, image_url }) {
  const result = await pool.query(
    `UPDATE products
       SET name = $1, description = $2, price = $3, stock = $4, image_url = $5
       WHERE id = $6 RETURNING *`,
    [name, description, price, stock, image_url, id]
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await pool.query(
    'DELETE FROM products WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
