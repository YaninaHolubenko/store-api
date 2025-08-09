//server.js
const express = require('express');
const helmet = require('helmet');
const xssClean = require('xss-clean');

const app = express();

const PORT = 3000;
const authRouter = require('./routes/auth');

app.use(express.json({ limit: '10kb' }));// This enables parsing JSON in request bodies
app.use(xssClean()); // remove malicious HTML/JS from inputs

// Catch malformed JSON errors and return clear 400
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    // bad JSON
    return res.status(400).json({ error: 'Malformed JSON in request body' });
  }
  next(); // not a JSON parse error—forward
});

// Import products router
const productsRouter = require('./routes/products');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');
const usersRouter = require('./routes/users');
const setupSwagger = require('./swagger');


// Mount products router at /products
app.use('/products', productsRouter);

app.use('/', authRouter);

app.use('/cart', cartRouter);

app.use('/orders', ordersRouter);

app.use('/users', usersRouter);

setupSwagger(app);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

