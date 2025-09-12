// validators/user.js
const { body, param } = require('express-validator');

/*
  Validation rules for updating user profile (PUT/PATCH /users)
  - Supports username/email updates
  - Supports password change via currentPassword/newPassword/newPasswordConfirm
  - Backward compatibility: accepts legacy `password` as "newPassword"
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

  // legacy "password" (treat as newPassword for backward compatibility)
  body('password')
    .optional()
    .isLength({ min: 8, max: 100 }).withMessage('password must be between 8 and 100 characters')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_])[A-Za-z\d!@#$%^&*_]+$/)
    .withMessage('password must include lowercase, uppercase, digit and one special character from !@#$%^&*_'),

  // password change bundle (preferred fields)
  body('currentPassword')
    .optional()
    .isString()
    .isLength({ min: 6 }).withMessage('currentPassword must be at least 6 characters'),

  body('newPassword')
    .optional()
    .isLength({ min: 8, max: 100 }).withMessage('newPassword must be between 8 and 100 characters')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_])[A-Za-z\d!@#$%^&*_]+$/)
    .withMessage('newPassword must include lowercase, uppercase, digit and one special character from !@#$%^&*_'),

  body('newPasswordConfirm')
    .optional()
    .custom((value, { req }) => {
      // If either field is provided, enforce equality
      const hasNew = typeof req.body.newPassword === 'string' && req.body.newPassword.length > 0;
      const hasConfirm = typeof value === 'string' && value.length > 0;
      if (hasNew || hasConfirm) {
        return value === req.body.newPassword;
      }
      return true;
    })
    .withMessage('Passwords do not match'),
];

/*
  Validation rule for path param :id
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
