exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    // 'role' is required and defaults to 'user'
    t.string('role', 20).notNullable().defaultTo('user');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('role');
  });
};