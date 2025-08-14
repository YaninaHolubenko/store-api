exports.up = async function up(knex) {
  await knex.schema.raw(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00
    )
  `);
};

exports.down = async function down(knex) {
  await knex.schema.raw('DROP TABLE IF EXISTS orders');
};