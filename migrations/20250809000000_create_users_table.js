exports.up = async function up(knex) {
  // Idempotent DDL: create only if it doesn't exist
  await knex.schema.raw(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(200) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

exports.down = async function down(knex) {
  // Safe rollback for fresh environments; do not run on your current DB unless intended
  await knex.schema.raw('DROP TABLE IF EXISTS users');
};