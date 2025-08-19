//server.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');


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

// Security & parsers
app.use(helmet()); // secure common HTTP headers
app.use(cors());   // enable CORS for browser clients
app.use(express.json({ limit: '10kb' })); // This enables parsing JSON in request bodies




setupSwagger(app);

// Routes
app.use('/products', productsRouter);
app.use('/', authRouter);
app.use('/cart', cartRouter);
app.use('/orders', ordersRouter);
app.use('/users', usersRouter);
app.use('/categories', categoriesRouter);
//sanitizer
app.use((req, res, next) => {
  const scrub = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      const val = obj[k];
      if (typeof val === 'string') {
        // Strip all tags/attributes
        obj[k] = sanitizeHtml(val, { allowedTags: [], allowedAttributes: {} });
      } else if (val && typeof val === 'object') {
        scrub(val); // recurse
      }
    }
  };
  // Only sanitize body and params. Do NOT assign to req.query.
  scrub(req.body);
  scrub(req.params);
  next();
});

// 404 handler 
app.use((req, res) => {
  return res.status(404).json({ error: 'Not found' });
});

// Centralized error handler
app.use((err, req, res, next) => {
  // Skip handling for Swagger UI requests
  if (req.originalUrl.startsWith('/docs')) {
    return next(err);
  }

  // Handle malformed JSON from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON in request body' });
  }

  console.error(err.stack || err);
  return res.status(err.status || 500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

