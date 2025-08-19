/** Safely ensure unique constraint on categories.name */
exports.up = async function (knex) {
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'categories_name_unique'
      ) THEN
        ALTER TABLE categories
        ADD CONSTRAINT categories_name_unique UNIQUE (name);
      END IF;
    END$$;
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'categories_name_unique'
      ) THEN
        ALTER TABLE categories
        DROP CONSTRAINT categories_name_unique;
      END IF;
    END$$;
  `);
};
