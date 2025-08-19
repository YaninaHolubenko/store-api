// controllers/productController.js

const Product = require('../models/product');
const Category = require('../models/category');

// GET /products
async function list(req, res) {
 try {
    const { categoryId } = req.query;

    // Validate optional categoryId
    if (categoryId !== undefined) {
      const cid = Number(categoryId);
      if (!Number.isInteger(cid) || cid <= 0) {
        return res.status(400).json({ error: 'categoryId must be a positive integer' });
      }
      const products = await Product.getAllByCategory(cid);
      return res.json(products);
    }

    // No categoryId -> return all products
    const products = await Product.getAll();
    return res.json(products);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
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

    if (payload.categoryId) {
      const category = await Category.getById(payload.categoryId);
      if (!category) {
        return res.status(400).json({ error: 'Invalid categoryId' });
      }
    }

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

    if (payload.categoryId) {
      const category = await Category.getById(payload.categoryId);
      if (!category) {
        return res.status(400).json({ error: 'Invalid categoryId' });
      }
    }

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
    // keep current successful shape to avoid breaking clients
    return res.json({ message: 'Product deleted', product: deleted });
  } catch (err) {
    console.error(err);
    // FK violation: product referenced by cart_items / order_items
    if (err && err.code === '23503') {
      return res.status(409).json({
        error: 'Product cannot be deleted because it is referenced by carts or orders'
      });
    }
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  remove
};
