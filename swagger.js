// swagger.js

const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi   = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Store API',
      version: '1.0.0',
      description: 'E-commerce REST API for Store App'
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local server' }
    ],
    components: {
      schemas: {
        // Описываем схему общего ответа об ошибке
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        }
      },
      securitySchemes: {
        // Определяем Bearer-авторизацию
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    // Всегда проверять JWT для всех операций
    security: [
      { bearerAuth: [] }
    ]
  },
  apis: ['./routes/*.js']  // Где искать ваши JSDoc-аннотации
};

const swaggerSpec = swaggerJSDoc(options);

function setupSwagger(app) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = setupSwagger;
