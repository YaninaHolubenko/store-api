// routes/users.js
const express = require('express');
// Use hybrid auth: Passport session OR JWT (backward compatible)
const authHybrid = require('../middlewares/authHybrid');
const userController = require('../controllers/userController');
const { validationResult } = require('express-validator');
const { updateProfileRules, idParamRule } = require('../validators/user');
const router = express.Router();

// Protect all routes under /users
router.use(authHybrid);

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get current user's profile
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: The user's profile information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       '401':
 *         description: Missing or invalid token
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
router.get('/', userController.getProfile);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Retrieve a specific user's profile (self only)
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
 *         description: ID of the user to retrieve
 */
router.get(
  '/:id',
  idParamRule,
  (req, res, next) => {
    // Validate path params
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  userController.getById
);

/**
 * @openapi
 * /users:
 *   put:
 *     summary: Update current user's profile (full update)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/',
  updateProfileRules,
  (req, res, next) => {
    // Validate body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  userController.updateProfile
);

/**
 * @openapi
 * /users:
 *   patch:
 *     summary: Partially update current user's profile
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateInput'
 *           example:
 *             email: alice@example.com
 *             password: NewPassw0rd!
 *     responses:
 *       '200':
 *         description: User profile updated successfully
 */
router.patch(
  '/',
  updateProfileRules,
  (req, res, next) => {
    // Validate body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  userController.updateProfile
);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete current user's account (self only)
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  idParamRule,
  (req, res, next) => {
    // Validate path params
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  userController.deleteById
);

module.exports = router;
