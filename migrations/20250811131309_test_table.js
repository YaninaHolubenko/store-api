export async function up(knex) {
  await knex.schema.createTable('test_table', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('test_table');
}
