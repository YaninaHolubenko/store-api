// routes/users.js
const express = require('express');
const authenticateToken = require('../middlewares/auth');
const userController = require('../controllers/userController');
const router = express.Router();

// Protect all routes under /users
router.use(authenticateToken);

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get current user's profile
 *     tags:
 *       - Users
 */
router.get('/', userController.getProfile);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Retrieve a specific user's profile (self only)
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user to retrieve
 *     responses:
 *       '200':
 *         description: User profile
 *       '403':
 *         description: Forbidden access
 *       '404':
 *         description: User not found
 */
router.get('/:id', userController.getById);

/**
 * @openapi
 * /users:
 *   put:
 *     summary: Update current user's profile
 *     tags:
 *       - Users
 */
router.put('/', userController.updateProfile);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete current user's account (self only)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to delete
 *     responses:
 *       204:
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.delete('/:id', userController.deleteById);

module.exports = router;
