exports.up = async function up(knex) {
  await knex.schema.raw(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      description TEXT,
      price NUMERIC(10, 2) NOT NULL,
      stock INTEGER NOT NULL,
      image_url VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

exports.down = async function down(knex) {
  await knex.schema.raw('DROP TABLE IF EXISTS products');
};