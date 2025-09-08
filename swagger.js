// swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Central OpenAPI config for the project.
 * - Global bearerAuth security (JWT) applied to all routes by default.
 * - Override per-route with `security: []` if an endpoint is public.
 * - Common reusable components (schemas/parameters/responses) live here.
 * - Server URL can be overridden via API_URL env var.
 */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Store API',
      version: '1.0.0',
      description: 'E-commerce REST API for Store App',
      contact: { name: 'Store App' },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: process.env.API_URL ? 'Configured server' : 'Local server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },

      // ---- Reusable parameters / responses ----
      parameters: {
        PathId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'integer', minimum: 1 },
          description: 'Resource identifier',
        },
      },
      responses: {
        Unauthorized: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: { default: { value: { error: 'Unauthorized' } } },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: { default: { value: { error: 'Forbidden' } } },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: { default: { value: { error: 'Not found' } } },
            },
          },
        },
        BadRequest: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: { default: { value: { error: 'Invalid input' } } },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: { default: { value: { error: 'Server error' } } },
            },
          },
        },
      },

      // ---- Schemas ----
      schemas: {
        // Generic error envelope
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Error message' },
          },
          required: ['error'],
          example: { error: 'Something went wrong' },
        },

        // Auth
        AuthToken: {
          type: 'object',
          properties: { token: { type: 'string' } },
          required: ['token'],
          example: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
        RegisterInput: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string', maxLength: 50 },
            email: { type: 'string', format: 'email', maxLength: 100 },
            password: { type: 'string', minLength: 6 },
          },
          example: {
            username: 'alice',
            email: 'alice@example.com',
            password: 'p@ssw0rd',
          },
        },
        LoginInput: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', maxLength: 50 },
            password: { type: 'string' },
          },
          example: { username: 'alice', password: 'p@ssw0rd' },
        },

        // Users
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            created_at: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'username', 'email', 'created_at'],
        },
        UserInput: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string', maxLength: 50 },
            email: { type: 'string', format: 'email', maxLength: 100 },
            password: { type: 'string', minLength: 6 },
          },
        },
        UserUpdateInput: {
          type: 'object',
          properties: {
            username: { type: 'string', maxLength: 50 },
            email: { type: 'string', format: 'email', maxLength: 100 },
            password: { type: 'string', minLength: 6 },
          },
        },

        // Products
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            price: { type: 'number', format: 'float' },
            stock: { type: 'integer' },
            image_url: { type: 'string', nullable: true },
            category_id: {
              type: 'integer',
              nullable: true,
              description: 'FK to categories.id (response field)',
            },
            created_at: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'name', 'price', 'stock', 'created_at'],
        },
        ProductInput: {
          type: 'object',
          required: ['name', 'description', 'price', 'stock'],
          properties: {
            name: { type: 'string', maxLength: 50 },
            description: { type: 'string' },
            price: { type: 'number', format: 'float', minimum: 0, example: 0 },
            stock: { type: 'integer', minimum: 0, example: 0 },
            image_url: { type: 'string', maxLength: 200, nullable: true },
            categoryId: {
              type: 'integer',
              nullable: true,
              description: 'Optional category id to attach (request field)',
              example: null,
            },
          },
        },
        ProductUpdateInput: {
          type: 'object',
          properties: {
            name: { type: 'string', maxLength: 50 },
            description: { type: 'string' },
            price: { type: 'number', format: 'float', minimum: 0, example: 0 },
            stock: { type: 'integer', minimum: 0, example: 0 },
            image_url: { type: 'string', maxLength: 200, nullable: true },
            categoryId: {
              type: 'integer',
              nullable: true,
              description: 'Optional category id to attach (request field)',
              example: null,
            },
          },
        },
        Category: {
          type: 'object',
          properties: { id: { type: 'integer' }, name: { type: 'string' } },
          required: ['id', 'name'],
        },
        CategoryInput: {
          type: 'object',
          required: ['name'],
          properties: { name: { type: 'string' } },
        },

        // Carts
        Cart: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            user_id: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'user_id', 'created_at'],
        },
        CartItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            cart_id: { type: 'integer' },
            productId: { type: 'integer' },
            quantity: { type: 'integer' },
          },
          required: ['id', 'cart_id', 'productId', 'quantity'],
        },
        CartWithItems: {
          type: 'object',
          properties: {
            cart: { $ref: '#/components/schemas/Cart' },
            items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
          },
          required: ['cart', 'items'],
        },
        CartAddItemInput: {
          type: 'object',
          required: ['productId', 'quantity'],
          properties: {
            productId: { type: 'integer' },
            quantity: { type: 'integer', minimum: 1 },
          },
          example: { productId: 1, quantity: 2 },
        },

        // Orders
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            user_id: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            status: {
              type: 'string',
              description: 'Order status',
              enum: ['pending', 'shipped', 'delivered', 'cancelled'],
            },
            total_amount: { type: 'number', format: 'float' },
          },
          required: ['id', 'user_id', 'created_at', 'status', 'total_amount'],
        },
        OrderItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            order_id: { type: 'integer' },
            productId: { type: 'integer' },
            quantity: { type: 'integer' },
            price: { type: 'number', format: 'float' },
          },
          required: ['id', 'order_id', 'productId', 'quantity', 'price'],
        },
        OrderWithItems: {
          type: 'object',
          properties: {
            order: { $ref: '#/components/schemas/Order' },
            items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
          },
          required: ['order', 'items'],
        },

        // Payments (Stripe)
        PaymentIntentRequest: {
          type: 'object',
          required: ['amount', 'currency'],
          properties: {
            amount: {
              type: 'integer',
              minimum: 1,
              description: 'Total amount in the smallest currency unit (e.g. cents)',
            },
            currency: { type: 'string', example: 'usd' },
            metadata: {
              type: 'object',
              additionalProperties: { type: 'string' },
              description: 'Optional metadata (e.g. userId, cartId)',
            },
          },
          example: { amount: 2599, currency: 'usd', metadata: { cartId: '123' } },
        },
        PaymentIntentResponse: {
          type: 'object',
          properties: {
            client_secret: { type: 'string' },
            id: { type: 'string', description: 'Stripe PaymentIntent id' },
            status: { type: 'string' },
          },
          required: ['client_secret'],
          example: {
            id: 'pi_3Nxyz...',
            status: 'requires_confirmation',
            client_secret: 'pi_3Nxyz_secret_abc',
          },
        },
        // NEW: response schema that matches our controller (camelCase)
        PaymentIntentCreatedResponse: {
          type: 'object',
          properties: {
            clientSecret: { type: 'string' },
            amount: { type: 'integer' },
            currency: { type: 'string' },
          },
          required: ['clientSecret'],
          example: {
            clientSecret: 'pi_12345_secret_abcdef',
            amount: 2599,
            currency: 'gbp',
          },
        },

        // Pagination (optional, for list endpoints)
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1 },
            pageSize: { type: 'integer', minimum: 1 },
            total: { type: 'integer', minimum: 0 },
          },
          required: ['page', 'pageSize', 'total'],
          example: { page: 1, pageSize: 20, total: 125 },
        },
      },
    },

    // Apply JWT to all routes by default
    security: [{ bearerAuth: [] }],
  },

  // Pick up JSDoc annotations from route files (and nested folders)
  apis: ['./routes/*.js', './routes/**/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

function setupSwagger(app) {
  // Serve raw JSON for tooling/integration
  app.get('/docs.json', (_req, res) => res.json(swaggerSpec));

  // Interactive UI at /docs
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
}

module.exports = setupSwagger;
