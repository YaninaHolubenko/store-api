// controllers/categoryController.js
// Category controller: list, create, update, remove

const Category = require('../models/category');

/**
 * Get all categories (public)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function list(req, res) {
  try {
    const categories = await Category.getAll();
    return res.json(categories);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Create a category (admin only)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function create(req, res) {
  try {
    const { name } = req.body;
    // Basic validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const created = await Category.create({ name: name.trim() });
    return res.status(201).json(created);
  } catch (err) {
    console.error(err);
    // Unique constraint violation (duplicate name)
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Update a category (admin only)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function update(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid category id' });
    }

    const { name } = req.body;
    // Allow partial update; if name is provided, validate non-empty string
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name must be a non-empty string' });
      }
    }

    const updated = await Category.update(id, { name: name?.trim() });
    if (!updated) {
      return res.status(404).json({ error: 'Category not found' });
    }
    return res.json(updated);
  } catch (err) {
    console.error(err);
    // Unique violation on "name"
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Delete a category (admin only)
 * NOTE: products.category_id has ON DELETE SET NULL, so products remain without a category
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function remove(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid category id' });
    }

    const deleted = await Category.remove(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Category not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  list,
  create,
  update,
  remove,
};
