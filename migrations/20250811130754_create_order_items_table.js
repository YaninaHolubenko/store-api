exports.up = async function up(knex) {
  await knex.schema.raw(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      price NUMERIC(10, 2) NOT NULL
    )
  `);
};

exports.down = async function down(knex) {
  // Safe rollback for fresh environments only
  await knex.schema.raw('DROP TABLE IF EXISTS order_items');
};

