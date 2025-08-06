//server.js
const express = require('express');
const app = express();
const PORT = 3000;
const authRouter = require('./routes/auth');
// Import products router
const productsRouter = require('./routes/products');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');
const usersRouter = require('./routes/users');
const setupSwagger = require('./swagger');

app.use(express.json());// This enables parsing JSON in request bodies

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

