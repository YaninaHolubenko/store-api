//server.js
const express = require('express');
const app = express();
const PORT = 3000;

// Import products router
const productsRouter = require('./routes/products');

app.use(express.json());// This enables parsing JSON in request bodies

// Mount products router at /products
app.use('/products', productsRouter);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
