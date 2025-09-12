// validators/product.js
const { body, param } = require('express-validator');

// Allow: empty, http(s) URL, data:image/* (utf8 or base64), relative path
function isAllowedImageUrl(value) {
  if (value === '' || value == null) return true;
  if (typeof value !== 'string') return false;
  const v = value.trim();

  // data:image (base64)
  if (/^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(v)) return true;

  // data:image/svg+xml;utf8,...
  if (/^data:image\/svg\+xml(?:;charset=[^,;]+)?;?utf8,.+/i.test(v)) return true;

  // http(s) URL
  try {
    const u = new URL(v);
    if (u.protocol === 'http:' || u.protocol === 'https:') return true;
  } catch (_) {
    /* not a full URL */
  }

  // site-relative path (/images/foo.jpg or ./bar.png, ../bar.png)
  if (/^(?:\/|\.{1,2}\/)[^\s]+$/.test(v)) return true;

  return false;
}

/*
  Rules for creating a product (POST /products)
*/
const createProductRules = [
  body('name')
    .exists().withMessage('name is required')
    .bail()
    .isString().withMessage('name must be a string')
    .bail()
    .isLength({ min: 1, max: 100 }).withMessage('name must be between 1 and 100 characters')
    .trim()
    .escape(),

  body('description')
    .exists().withMessage('description is required')
    .bail()
    .isString().withMessage('description must be a string')
    .bail()
    .isLength({ max: 1000 }).withMessage('description can be at most 1000 characters')
    .trim()
    .escape(),

  // cast to number so downstream code always receives numeric types
  body('price')
    .exists().withMessage('price is required')
    .bail()
    .isFloat({ min: 0 }).withMessage('price must be >= 0')
    .toFloat(),

  body('stock')
    .exists().withMessage('stock is required')
    .bail()
    .isInt({ min: 0 }).withMessage('stock must be >= 0')
    .toInt(),

  body('image_url')
    .optional({ nullable: true })
    .custom(isAllowedImageUrl)
    .withMessage('image_url must be empty, an http(s) URL, a data:image URI, or a relative path'),

  body('categoryId')
    .optional({ nullable: true })
    .custom((v) => v === null || (Number.isInteger(v) && v > 0))
    .withMessage('categoryId must be a positive integer or null'),
];

/**
 * Rules for updating a product (PUT /products/:id)
 */
const updateProductRules = [
  body('name')
    .optional()
    .isString().withMessage('name must be a string')
    .bail()
    .isLength({ min: 1, max: 100 }).withMessage('name must be between 1 and 100 characters')
    .trim()
    .escape(),

  body('description')
    .optional()
    .isString().withMessage('description must be a string')
    .bail()
    .isLength({ max: 1000 }).withMessage('description can be at most 1000 characters')
    .trim()
    .escape(),

  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('price must be >= 0')
    .toFloat(),

  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('stock must be >= 0')
    .toInt(),

  body('image_url')
    .optional({ nullable: true })
    .custom(isAllowedImageUrl)
    .withMessage('image_url must be empty, an http(s) URL, a data:image URI, or a relative path'),

  body('categoryId')
    .optional({ nullable: true })
    .custom((v) => v === null || (Number.isInteger(v) && v > 0))
    .withMessage('categoryId must be a positive integer or null'),
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
