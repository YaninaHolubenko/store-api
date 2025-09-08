// routes/users.js
const express = require('express');
// Use hybrid auth: Passport session OR JWT (backward compatible)
const authHybrid = require('../middlewares/authHybrid');
const checkAdmin = require('../middlewares/checkAdmin');
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
 * /users/admin:
 *   get:
 *     summary: List users (admin only) with optional search and pagination
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         required: false
 *         description: Search by username or email (ILIKE)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         required: false
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         required: false
 *     responses:
 *       '200':
 *         description: Users list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       username: { type: string }
 *                       email: { type: string, format: email }
 *                       role: { type: string }
 *                       created_at: { type: string, format: date-time }
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       '401':
 *         description: Unauthorized
 *       '403':
 *         description: Forbidden
 */
router.get('/admin', checkAdmin, userController.adminList);

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
