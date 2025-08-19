exports.up = async function (knex) {
  // create unique index on LOWER(name) to enforce case-insensitive uniqueness
  await knex.schema.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS categories_name_lower_unique
    ON categories (LOWER(name));
  `);
};

exports.down = async function (knex) {
  // drop that index if we roll back
  await knex.schema.raw(`
    DROP INDEX IF EXISTS categories_name_lower_unique;
  `);
};
