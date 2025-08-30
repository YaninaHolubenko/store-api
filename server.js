require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const passport = require('passport');

const googleAuthRouter = require('./routes/auth.google');

const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');
const usersRouter = require('./routes/users');
const categoriesRouter = require('./routes/categories');

const sanitizeHtml = require('sanitize-html');
const setupSwagger = require('./swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// 1) Security & parsers
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// 2) Sanitizer — BEFORE routes
app.use((req, res, next) => {
  const scrub = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      const val = obj[k];
      if (typeof val === 'string') {
        obj[k] = sanitizeHtml(val, { allowedTags: [], allowedAttributes: {} });
      } else if (val && typeof val === 'object') {
        scrub(val);
      }
    }
  };
  scrub(req.body);
  scrub(req.params);
  next();
});

// 3) Passport init BEFORE routes
app.use(passport.initialize());

// 4) Routes
app.use('/auth', googleAuthRouter); // Google OAuth first is fine

setupSwagger(app);

app.use('/products', productsRouter);
app.use('/', authRouter);
app.use('/cart', cartRouter);
app.use('/orders', ordersRouter);
app.use('/users', usersRouter);
app.use('/categories', categoriesRouter);

// 5) 404 + errors
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  if (req.originalUrl.startsWith('/docs')) return next(err);
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON in request body' });
  }
  console.error(err.stack || err);
  res.status(err.status || 500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
