exports.up = function (knex) {
  return knex.schema.alterTable('products', (table) => {
    table.integer('category_id').nullable().alter();
  })
  .then(() => knex.raw('ALTER TABLE products ALTER COLUMN category_id DROP DEFAULT'));
};

exports.down = function (knex) {
  return knex.schema.alterTable('products', (table) => {
    table.integer('category_id').notNullable().defaultTo(0).alter();
  });
};
