// models/product.js

const pool = require('../db/index');

// Data access methods for products
async function getAll() {
  const res = await pool.query(
    `SELECT id, name, description, price, stock, image_url, category_id
     FROM products
     ORDER BY id DESC`
  );
  return res.rows;
}

async function getById(id) {
  const res = await pool.query(
    `SELECT id, name, description, price, stock, image_url, category_id
     FROM products
     WHERE id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

// Get all products by category id
async function getAllByCategory(categoryId) {
  const res = await pool.query(
    `SELECT id, name, description, price, stock, image_url, category_id
     FROM products
     WHERE category_id = $1
     ORDER BY id DESC`,
    [categoryId]
  );
  return res.rows;
}

async function create(payload) {
  const {
    name,
    description,
    price,
    stock,
    image_url,
    categoryId // optional
  } = payload;

  const res = await pool.query(
    `INSERT INTO products (name, description, price, stock, image_url, category_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, description, price, stock, image_url, category_id`,
    [
      name,
      description ?? null,
      price,
      stock,
      image_url ?? null,
      categoryId ?? null
    ]
  );
  return res.rows[0];
}

async function update(id, payload) {
  const {
    name,
    description,
    price,
    stock,
    image_url,
    categoryId // optional
  } = payload;

  const res = await pool.query(
    `UPDATE products
     SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       price = COALESCE($3, price),
       stock = COALESCE($4, stock),
       image_url = COALESCE($5, image_url),
       category_id = COALESCE($6, category_id)
     WHERE id = $7
     RETURNING id, name, description, price, stock, image_url, category_id`,
    [
      name ?? null,
      description ?? null,
      price ?? null,
      stock ?? null,
      image_url ?? null,
      categoryId ?? null,
      id
    ]
  );
  return res.rows[0] || null;
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
  getAllByCategory,
  create,
  update,
  remove
};
