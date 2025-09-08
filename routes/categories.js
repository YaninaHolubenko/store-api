// routes/categories.js
const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/categoryController');
const authenticateToken = require('../middlewares/auth');      // verifies JWT, sets req.user.id
const checkAdmin = require('../middlewares/checkAdmin');       // ensures req.user.role === 'admin'

/**
 * @openapi
 * /categories:
 *   get:
 *     summary: Get all categories
 *     tags:
 *       - Categories
 *     security: []  # public
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Public: list categories
router.get('/', categoryController.list);

/**
 * @openapi
 * /categories:
 *   post:
 *     summary: Create a new category (admin only)
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       201:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: Conflict (duplicate category name)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Admin: create category
router.post('/', authenticateToken, checkAdmin, categoryController.create);

/**
 * @openapi
 * /categories/{id}:
 *   put:
 *     summary: Update a category (admin only)
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PathId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       200:
 *         description: Category updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Conflict (duplicate category name)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Admin: update category
router.put('/:id', authenticateToken, checkAdmin, categoryController.update);

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     summary: Delete a category (admin only)
 *     description: Products keep their records; their category becomes NULL (ON DELETE SET NULL)
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PathId'
 *     responses:
 *       204:
 *         description: Category deleted successfully
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
// Admin: delete category
router.delete('/:id', authenticateToken, checkAdmin, categoryController.remove);

module.exports = router;
