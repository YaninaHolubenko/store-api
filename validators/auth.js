// validators/auth.js
const { body } = require('express-validator');

/**
 * Validation rules for POST /register
 */
const registerRules = [
    // username: required, 3–30 chars, only English letters, numbers, underscore, no spaces
    body('username')
        .exists().withMessage('username is required')
        .bail()
        .isLength({ min: 3, max: 30 })
        .withMessage('username must be between 3 and 30 characters')
        .bail()
        .matches(/^[A-Za-z0-9_]+$/)
        .withMessage('username can only contain English letters, digits, and underscore')
        .trim()
        .escape(),

    // email: required, valid, normalized
    body('email')
        .exists().withMessage('email is required')
        .bail()
        .isEmail().withMessage('email must be a valid email address')
        .bail()
        .trim()
        .normalizeEmail(),

    /**
     * password: required, 8–100 chars, at least one lowercase, one uppercase,
     * one digit and one special char from !@#$%^&*
     */
    body('password')
        .exists().withMessage('password is required')
        .bail()
        .isLength({ min: 8, max: 100 })
        .withMessage('password must be between 8 and 100 characters')
        .bail()
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_])[A-Za-z\d!@#$%^&*_]+$/)
        .withMessage(
            'password must include at least one lowercase letter, one uppercase letter, one digit, ' +
            'and one special character from !@#$%^&*_; and contain only ASCII letters, digits, and these symbols (no spaces or other characters)'
        ),
];

/**
 * Validation rules for POST /login
 */
const loginRules = [
    // username: required, trimmed
    body('username')
        .exists().withMessage('username is required')
        .trim()
        .escape()
        .bail(),
    // password: required
    body('password')
        .exists().withMessage('password is required'),
];

module.exports = {
    registerRules,
    loginRules,
};
