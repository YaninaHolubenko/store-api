// controllers/productController.js

const Product = require('../models/product');

// GET /products
async function list(req, res) {
  try {
    const products = await Product.getAll();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /products/:id
async function getOne(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const product = await Product.getById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /products
async function create(req, res) {
  try {
    const payload = req.body;
    const newProduct = await Product.create(payload);
    res.status(201).json(newProduct);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// PUT /products/:id
async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const payload = req.body;
    const updated = await Product.update(id, payload);
    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// DELETE /products/:id
async function remove(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await Product.remove(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted', product: deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  remove
};
