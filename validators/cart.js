// validators/cart.js
const { body, param } = require('express-validator');

const currentYear = new Date().getFullYear();


const addItem = [
  body('productId')
    .exists().withMessage('productId is required')
    .bail()
    .isInt({ gt: 0 }).withMessage('productId must be a positive integer'),
  body('quantity')
    .exists().withMessage('quantity is required')
    .bail()
    .isInt({ gt: 0 }).withMessage('quantity must be a positive integer'),
];

const updateItem = [
  param('id')
    .exists().withMessage('Cart item ID is required')
    .bail()
    .isInt({ gt: 0 }).withMessage('Cart item ID must be a positive integer'),
  body('quantity')
    .exists().withMessage('quantity is required')
    .bail()
    .isInt({ gt: 0 }).withMessage('quantity must be a positive integer'),
];

const checkoutRules = [
  // cartId from path
  param('cartId')
    .exists().withMessage('cartId is required')
    .bail()
    .isInt({ min: 1 }).withMessage('cartId must be a positive integer'),

  // payment object
  body('payment')
    .exists().withMessage('payment is required'),

  // method
  body('payment.method')
    .exists().withMessage('payment.method is required')
    .bail()
    .isIn(['card']).withMessage('payment.method must be "card"'),

  // card details
  body('payment.card.number')
    .exists().withMessage('card.number is required')
    .bail()
    .isCreditCard().withMessage('card.number must be a valid credit card number'),

  body('payment.card.expMonth')
    .exists().withMessage('card.expMonth is required')
    .bail()
    .isInt({ min: 1, max: 12 }).withMessage('card.expMonth must be 1-12'),

  body('payment.card.expYear')
    .exists().withMessage('card.expYear is required')
    .bail()
    .isInt({ min: currentYear, max: currentYear + 25 })
    .withMessage(`card.expYear must be between ${currentYear} and ${currentYear + 25}`),

  body('payment.card.cvc')
    .exists().withMessage('card.cvc is required')
    .bail()
    .matches(/^\d{3,4}$/).withMessage('card.cvc must be 3-4 digits'),

  body('payment.card.name')
    .exists().withMessage('card.name is required')
    .bail()
    .isLength({ min: 1, max: 100 }).withMessage('card.name must be 1-100 characters'),
];

module.exports = { addItem, updateItem, checkoutRules };
