// validators/product.js
const { body, param } = require('express-validator');

/**
 * Rules for creating a product (POST /products)
 */
const createProductRules = [
    body('name')
        .exists().withMessage('name is required')
        .bail()
        .isString().withMessage('name must be a string')
        .bail()
        .isLength({ min: 1, max: 100 }).withMessage('name must be between 1 and 100 characters')
        .trim()
        .escape(),  // sanitize HTML characters

    body('description')
        .exists().withMessage('description is required')
        .bail()
        .isString().withMessage('description must be a string')
        .bail()
        .isLength({ max: 1000 }).withMessage('description can be at most 1000 characters')
        .trim()
        .escape(),  // sanitize HTML characters

    body('price')
        .exists().withMessage('price is required')
        .bail()
        .isFloat({ gt: 0 }).withMessage('price must be a number greater than 0'),
       

    body('stock')
        .exists().withMessage('stock is required')
        .bail()
        .isInt({ min: 0 }).withMessage('stock must be a non-negative integer'),
        

    body('image_url')
        .optional()
        .custom(value => value === '' || /^(https?:\/\/[^\s$.?#].[^\s]*)$/.test(value))
        .withMessage('image_url must be either empty or a valid URL'),
        
];

/**
 * Rules for updating a product (PUT /products/:id)
 * same as create but all fields optional
 */
const updateProductRules = [
    body('name')
        .optional()
        .isString().withMessage('name must be a string')
        .bail()
        .isLength({ min: 1, max: 100 }).withMessage('name must be between 1 and 100 characters')
        .trim()
        .escape(),  // sanitize HTML characters

    body('description')
        .optional()
        .isString().withMessage('description must be a string')
        .bail()
        .isLength({ max: 1000 }).withMessage('description can be at most 1000 characters')
        .trim()
        .escape(),  // sanitize HTML characters

    body('price')
        .optional()
        .isFloat({ gt: 0 }).withMessage('price must be a number greater than 0'),

    body('stock')
        .optional()
        .isInt({ min: 0 }).withMessage('stock must be a non-negative integer'),

    body('image_url')
        .optional()                                   // skip if field is missing or exactly undefined
        .custom(value => {
            // allow empty string
            if (value === '') return true;
            // otherwise must be a valid URL
            // this uses express-validator's internal URL checker
            return /^(https?:\/\/[^\s$.?#].[^\s]*)$/.test(value);
        })
        .withMessage('image_url must be either empty or a valid URL'),
];

/**
 * Rule for validating :id param
 */
const idParamRule = [
    param('id')
        .exists().withMessage('id is required')
        .bail()
        .isInt({ min: 1 }).withMessage('id must be a positive integer'),
];

module.exports = {
    createProductRules,
    updateProductRules,
    idParamRule,
};
