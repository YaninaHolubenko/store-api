exports.up = async function (knex) {
  // 1) Create categories (minimal: id + unique name)
  await knex.schema.createTable('categories', (t) => {
    t.increments('id').primary();                 // PK
    t.string('name', 255).notNullable().unique(); // unique category name
    // if later you need description: t.text('description').nullable();
  });

  // 2) Add category_id to products (nullable to avoid breaking existing rows)
  await knex.schema.alterTable('products', (t) => {
    t
      .integer('category_id')
      .unsigned()
      .references('id')
      .inTable('categories')
      .onDelete('SET NULL')   // keep product; nullify category if category is removed
      .onUpdate('CASCADE')
      .index();               // speed up filtering by category
  });
};

/** Drop FK column from 'products' and then drop 'categories' */
exports.down = async function (knex) {
  await knex.schema.alterTable('products', (t) => {
    t.dropColumn('category_id');
  });
  await knex.schema.dropTableIfExists('categories');
};