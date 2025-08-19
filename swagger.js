// swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Full OpenAPI base config for the project.
 * - All common schemas live in components.schemas
 * - Global bearerAuth security (override per-route with `security: []` if needed)
 * - Server URL can be overridden via API_URL env
 */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Store API',
      version: '1.0.0',
      description: 'E-commerce REST API for Store App'
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: process.env.API_URL ? 'Configured server' : 'Local server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        // Generic error envelope
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Error message' }
          }
        },

        // Auth
        AuthToken: {
          type: 'object',
          properties: {
            token: { type: 'string' }
          }
        },
        RegisterInput: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string', maxLength: 50 },
            email: { type: 'string', format: 'email', maxLength: 100 },
            password: { type: 'string', minLength: 6 }
          }
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', maxLength: 100 },
            password: { type: 'string' }
          }
        },

        // Users
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        UserInput: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string', maxLength: 50 },
            email: { type: 'string', format: 'email', maxLength: 100 },
            password: { type: 'string', minLength: 6 }
          }
        },
        UserUpdateInput: {
          type: 'object',
          properties: {
            username: { type: 'string', maxLength: 50 },
            email: { type: 'string', format: 'email', maxLength: 100 },
            password: { type: 'string', minLength: 6 }
          }
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
              description: 'FK to categories.id (response field)'
            },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        ProductInput: {
          type: 'object',
          required: ['name', 'description', 'price', 'stock'],
          properties: {
            name: { type: 'string', maxLength: 50 },
            description: { type: 'string' },
            price: { type: 'number', format: 'float' },
            stock: { type: 'integer' },
            image_url: { type: 'string', maxLength: 200, nullable: true },
            categoryId: {
              type: 'integer',
              nullable: true,
              description: 'Optional category id to attach (request field)'
            }
          }
        },
        ProductUpdateInput: {
          type: 'object',
          properties: {
            name: { type: 'string', maxLength: 50 },
            description: { type: 'string' },
            price: { type: 'number', format: 'float' },
            stock: { type: 'integer' },
            image_url: { type: 'string', maxLength: 200, nullable: true },
            categoryId: {
              type: 'integer',
              nullable: true,
              description: 'Optional category id to attach (request field)'
            }
          }
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' }
          }
        },
        CategoryInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' }
          }
        },

        // Carts
        Cart: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            user_id: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        CartItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            cart_id: { type: 'integer' },
            productId: { type: 'integer' },
            quantity: { type: 'integer' }
          }
        },
        CartWithItems: {
          type: 'object',
          properties: {
            cart: { $ref: '#/components/schemas/Cart' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/CartItem' }
            }
          }
        },
        CartAddItemInput: {
          type: 'object',
          required: ['productId', 'quantity'],
          properties: {
            productId: { type: 'integer' },
            quantity: { type: 'integer', minimum: 1 }
          }
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
              description: "Order status",
              enum: ['pending', 'shipped', 'delivered', 'cancelled']
            },
            total_amount: { type: 'number', format: 'float' }
          }
        },
        OrderItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            order_id: { type: 'integer' },
            productId: { type: 'integer' },
            quantity: { type: 'integer' },
            price: { type: 'number', format: 'float' }
          }
        },
        OrderWithItems: {
          type: 'object',
          properties: {
            order: { $ref: '#/components/schemas/Order' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderItem' }
            }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./routes/*.js'] // Pick up JSDoc annotations from route files
};

const swaggerSpec = swaggerJSDoc(options);

function setupSwagger(app) {
  // Enable the interactive UI at /docs
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
}

module.exports = setupSwagger;
