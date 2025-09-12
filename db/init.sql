/* db\init.sql */
BEGIN;

-- 1) users (includes 'role' with default 'user')
CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  username       VARCHAR(50)  NOT NULL UNIQUE,
  email          VARCHAR(100) NOT NULL UNIQUE,
  password_hash  VARCHAR(200) NOT NULL,
  role           VARCHAR(20)  NOT NULL DEFAULT 'user',
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- 2) categories (unique name + named unique constraint + case-insensitive unique index)
CREATE TABLE IF NOT EXISTS categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(255) NOT NULL,
  CONSTRAINT categories_name_unique UNIQUE (name)
);

-- ensure case-insensitive uniqueness (matches your migration)
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_lower_unique
  ON categories (LOWER(name));

-- 3) products (nullable category_id, ON DELETE SET NULL, ON UPDATE CASCADE)
CREATE TABLE IF NOT EXISTS products (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(50)  NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL,
  stock        INTEGER      NOT NULL,
  image_url    VARCHAR(200),
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  category_id  INTEGER      NULL
    REFERENCES categories(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

-- index for filtering by category (your .index() in migration)
CREATE INDEX IF NOT EXISTS products_category_id_index
  ON products (category_id);

-- 4) carts (one active cart per user via UNIQUE(user_id))
CREATE TABLE IF NOT EXISTS carts (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL UNIQUE
    REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5) cart_items
CREATE TABLE IF NOT EXISTS cart_items (
  id          SERIAL PRIMARY KEY,
  cart_id     INTEGER NOT NULL
    REFERENCES carts(id),
  product_id  INTEGER NOT NULL
    REFERENCES products(id),
  quantity    INTEGER NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6) orders
CREATE TABLE IF NOT EXISTS orders (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL
    REFERENCES users(id),
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  status        VARCHAR(30)  NOT NULL DEFAULT 'pending',
  total_amount  NUMERIC(10,2) NOT NULL DEFAULT 0.00
);

-- 7) order_items
CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL
    REFERENCES orders(id),
  product_id  INTEGER NOT NULL
    REFERENCES products(id),
  quantity    INTEGER NOT NULL,
  price       NUMERIC(10,2) NOT NULL
);

COMMIT;
