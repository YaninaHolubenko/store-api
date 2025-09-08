// routes/products.js
const express = require('express');
const { validationResult } = require('express-validator');
const router = express.Router();
const productController = require('../controllers/productController');

const authHybrid = require('../middlewares/authHybrid');
const checkAdmin = require('../middlewares/checkAdmin');

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
 *     summary: Retrieve a list of products (optionally filtered by category)
 *     tags:
 *       - Products
 *     security: []  # public
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         required: false
 *         schema:
 *           type: integer
 *         description: If provided, returns only products with this category id
 *     responses:
 *       200:
 *         description: An array of product objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       500:
 *         $ref: '#/components/responses/ServerError'
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
 *     security: []  # public
 *     parameters:
 *       - $ref: '#/components/parameters/PathId'
 *     responses:
 *       200:
 *         description: Product object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
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
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// POST /products - admin only
router.post(
  '/',
  authHybrid,          // use hybrid guard (session OR JWT)
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
 *       - $ref: '#/components/parameters/PathId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// PUT /products/:id - admin only
router.put(
  '/:id',
  authHybrid,          // hybrid guard (session OR JWT)
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
 *       - $ref: '#/components/parameters/PathId'
 *     responses:
 *       204:
 *         description: Product deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Conflict (product is referenced by carts or orders)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// DELETE /products/:id - admin only
router.delete(
  '/:id',
  authHybrid,          // hybrid guard (session OR JWT)
  checkAdmin,
  idParamRule,
  validate,
  productController.remove
);

module.exports = router;
