// routes/products.js
const express = require('express');
const { validationResult } = require('express-validator');
const router = express.Router();
const productController = require('../controllers/productController');

// Auth & role guards (project uses CommonJS + these paths)
const authenticateToken = require('../middlewares/auth');      // verifies JWT, sets req.user.id
const checkAdmin = require('../middlewares/checkAdmin');       // ensures req.user.role === 'admin'

const {
  createProductRules,
  updateProductRules,
  idParamRule
} = require('../validators/product');

// Helper to send 400 on validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

/**
 * @openapi
 * /products:
 *   get:
 *     summary: Retrieve a list of all products
 *     tags:
 *       - Products
 *     responses:
 *       '200':
 *         description: An array of product objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       '500':
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /products - public
router.get('/', productController.list);

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     summary: Retrieve a single product by ID
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the product to retrieve
 *     responses:
 *       '200':
 *         description: Product object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       '404':
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /products/:id - public
router.get('/:id', idParamRule, validate, productController.getOne);

/**
 * @openapi
 * /products:
 *   post:
 *     summary: Create a new product (admin only)
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       '201':
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       '400':
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized (missing/invalid token)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Forbidden (admin only)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /products - admin only
router.post(
  '/',
  authenticateToken,
  checkAdmin,
  createProductRules,
  validate,
  productController.create
);

/**
 * @openapi
 * /products/{id}:
 *   put:
 *     summary: Update an existing product by ID (admin only)
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the product to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       '200':
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       '400':
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized (missing/invalid token)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Forbidden (admin only)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// PUT /products/:id - admin only
router.put(
  '/:id',
  authenticateToken,
  checkAdmin,
  [...idParamRule, ...updateProductRules],
  validate,
  productController.update
);

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     summary: Delete a product by ID (admin only)
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the product to delete
 *     responses:
 *       '204':
 *         description: Product deleted successfully
 *       '401':
 *         description: Unauthorized (missing/invalid token)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Forbidden (admin only)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '409':
 *         description: Conflict (product is referenced by carts or orders)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// DELETE /products/:id - admin only
router.delete(
  '/:id',
  authenticateToken,
  checkAdmin,
  idParamRule,
  validate,
  productController.remove
);

module.exports = router;
