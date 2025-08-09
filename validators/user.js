// validators/user.js
const { body, param } = require('express-validator');

/**
 * Validation rules for updating user profile (PUT /users)
 */
const updateProfileRules = [
  // username: optional, 3–30 chars, English letters, numbers, underscore
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 }).withMessage('username must be between 3 and 30 characters')
    .trim()
    .escape()
    .bail()
    .matches(/^[A-Za-z0-9_]+$/).withMessage('username can only contain English letters, digits, and underscore'),

  // email: optional, valid email, normalized
  body('email')
    .optional()
    .isEmail().withMessage('email must be a valid email address')
    .bail()
    .trim()
    .normalizeEmail(),

  /**
   * password: optional, 8–100 chars, at least one lowercase, one uppercase,
   * one digit and one special char from !@#$%^&*_
   */
  body('password')
    .optional()
    .isLength({ min: 8, max: 100 }).withMessage('password must be between 8 and 100 characters')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_])[A-Za-z\d!@#$%^&*_]+$/)
      .withMessage(
        'password must include lowercase, uppercase, digit and one special character from !@#$%^&*_'
      ),
];

/**
 * Validation rule for path param :id
 */
const idParamRule = [
  param('id')
    .exists().withMessage('user id is required')
    .bail()
    .isInt({ min: 1 }).withMessage('user id must be a positive integer'),
];

module.exports = {
  updateProfileRules,
  idParamRule,
};
