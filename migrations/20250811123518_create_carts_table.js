// Safe baseline migration for "carts" that won't recreate an existing table
exports.up = async function up(knex) {
  await knex.schema.raw(`
    CREATE TABLE IF NOT EXISTS carts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

exports.down = async function down(knex) {
  // Safe rollback for fresh environments
  await knex.schema.raw('DROP TABLE IF EXISTS carts');
};