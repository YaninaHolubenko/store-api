// Import products from DummyJSON + create/link categories.
// Works both on Render (DATABASE_URL) and locally (knexfile.js).

require('dotenv').config();

const knexfile = require('../knexfile.js');
const knexLib = require('knex');

// --- choose connection source ---
// On Render we have DATABASE_URL; locally we use knexfile.development.
const resolvedConfig = process.env.DATABASE_URL
  ? {
      client: 'pg',
      connection: {
        connectionString: process.env.DATABASE_URL, // Render external connection string
        ssl: { rejectUnauthorized: false },         // required on Render
      },
      pool: { min: 0, max: 5 },
    }
  : knexfile.development;

const knex = knexLib(resolvedConfig);

// Use global fetch (Node 18+) or fall back to node-fetch v2
let fetchFn = global.fetch;
if (typeof fetchFn !== 'function') {
  try {
    fetchFn = require('node-fetch'); // dev dep: npm i -D node-fetch@2
  } catch (e) {
    console.error('No fetch available. Install: npm i -D node-fetch@2');
    process.exit(1);
  }
}

async function tableExists(table) {
  return knex.schema.hasTable(table);
}
async function columnExists(table, col) {
  return knex.schema.hasColumn(table, col);
}

function toTitleCase(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function main() {
  console.log('[import] Start. Using', process.env.DATABASE_URL ? 'DATABASE_URL' : 'knexfile.development');

  const hasProducts = await tableExists('products');
  if (!hasProducts) throw new Error('Table "products" not found');

  const hasCategories = await tableExists('categories');
  const hasProductsCategoryId = await columnExists('products', 'category_id');
  const hasPivot =
    (await tableExists('product_categories')) || (await tableExists('product_category'));

  console.log('[import] schema:', {
    hasCategories,
    hasProductsCategoryId,
    hasPivot,
  });

  console.log('[import] fetching DummyJSON...');
  const resp = await fetchFn('https://dummyjson.com/products?limit=100');
  if (!resp.ok) throw new Error(`DummyJSON HTTP ${resp.status}`);
  const data = await resp.json();
  const productsIncoming = (data.products || []).map((p) => ({
    name: p.title,
    description: p.description || '',
    price: Number(p.price) || 0,
    stock: typeof p.stock === 'number' ? p.stock : 50,
    image_url: (p.images && p.images.length ? p.images[0] : p.thumbnail) || null,
    categoryName: String(p.category || '').trim() || 'uncategorized',
  }));

  if (!productsIncoming.length) {
    console.log('[import] nothing to import');
    return;
  }

  // Prepare categories set
  const categoryNames = Array.from(new Set(productsIncoming.map((p) => p.categoryName)));
  const categoryIdByName = new Map();

  if (hasCategories) {
    // Load existing categories
    const existing = await knex('categories')
      .whereIn('name', categoryNames)
      .select('id', 'name');
    existing.forEach((c) => categoryIdByName.set(c.name, c.id));

    // Insert missing categories
    const missing = categoryNames.filter((n) => !categoryIdByName.has(n));
    if (missing.length) {
      const rows = missing.map((name) => ({
        name,                          // keep backend name as-is (slug-like, e.g. "smartphones")
        display_name: toTitleCase(name) // optional if you have this column
      }));

      // Keep only existing columns
      let insertRows = rows;
      const hasDisplay = await columnExists('categories', 'display_name');
      if (!hasDisplay) {
        insertRows = rows.map(r => ({ name: r.name }));
      }

      const inserted = await knex('categories').insert(insertRows).returning(['id', 'name']);
      inserted.forEach((c) => categoryIdByName.set(c.name, c.id));
      console.log(`[import] inserted categories: ${inserted.length}`);
    } else {
      console.log('[import] all categories already exist');
    }
  } else {
    console.log('[import] WARNING: no "categories" table. Products will remain without linking.');
  }

  // Read existing product names to avoid duplicates
  const existingNames = new Set((await knex('products').pluck('name')).map(String));

  // Insert products that are not present yet (by unique name)
  const toInsert = [];
  for (const p of productsIncoming) {
    if (existingNames.has(p.name)) continue;
    const base = {
      name: p.name,
      description: p.description,
      price: p.price,
      stock: p.stock,
      image_url: p.image_url,
    };
    if (hasCategories && hasProductsCategoryId) {
      const catId = categoryIdByName.get(p.categoryName) || null;
      base.category_id = catId;
    }
    toInsert.push(base);
  }

  if (toInsert.length) {
    const inserted = await knex('products').insert(toInsert).returning(['id', 'name']);
    console.log(`[import] inserted products: ${inserted.length}`);
  } else {
    console.log('[import] products skipped (all already present by name)');
  }

  // If no products.category_id, but there is a pivot table, link via pivot
  if (hasCategories && !hasProductsCategoryId && hasPivot) {
    const pivotName = (await tableExists('product_categories')) ? 'product_categories' : 'product_category';
    const allNeededNames = Array.from(new Set(productsIncoming.map((p) => p.name)));
    const prodRows = await knex('products').whereIn('name', allNeededNames).select('id', 'name');

    const productIdByName = new Map(prodRows.map((r) => [r.name, r.id]));

    let created = 0;
    for (const p of productsIncoming) {
      const pid = productIdByName.get(p.name);
      const cid = categoryIdByName.get(p.categoryName);
      if (!pid || !cid) continue;

      const exists = await knex(pivotName)
        .where({ product_id: pid, category_id: cid })
        .first();
      if (!exists) {
        await knex(pivotName).insert({ product_id: pid, category_id: cid });
        created++;
      }
    }
    console.log(`[import] pivot links created: ${created}`);
  }

  console.log('[import] done');
}

main()
  .catch((e) => {
    console.error('[import] failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await knex.destroy();
  });
