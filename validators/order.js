// validators/order.js
const { param, body } = require('express-validator');

// Allowed order statuses
const VALID_STATUSES = ['pending', 'shipped', 'delivered', 'cancelled'];

/*
  Validate :id path parameter (positive integer)
*/
const idParamRule = [
  param('id')
    .exists().withMessage('order id is required')
    .bail()
    .isInt({ min: 1 }).withMessage('order id must be a positive integer'),
];

/*
  Validate body for PATCH /orders/:id
*/
const updateStatusRules = [
  ...idParamRule,
  body('status')
    .exists().withMessage('status is required')
    .bail()
    .isString().withMessage('status must be a string')
    .bail()
    .isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
];

module.exports = {
  idParamRule,
  updateStatusRules,
};
