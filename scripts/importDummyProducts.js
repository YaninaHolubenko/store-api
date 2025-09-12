// scripts/importDummyProducts.js
// Import realistic demo products from DummyJSON into Postgres via Knex

require('dotenv').config(); // load .env so knexfile uses the same DB creds
const knexConfig = require('../knexfile.js');
const env = process.env.NODE_ENV || 'development';
const knex = require('knex')(knexConfig[env] || knexConfig);

// Use global fetch if Node >= 18, otherwise fallback to node-fetch v2
let fetchFn = global.fetch;
if (typeof fetchFn !== 'function') {
  try {
    fetchFn = require('node-fetch'); // dev dep: npm i -D node-fetch@2 (only if needed)
  } catch (e) {
    console.error('No fetch available. Install: npm i -D node-fetch@2');
    process.exit(1);
  }
}

async function main() {
  console.log('[import] Fetching products from DummyJSON...');
  const resp = await fetchFn('https://dummyjson.com/products?limit=100');
  if (!resp.ok) throw new Error(`DummyJSON HTTP ${resp.status}`);
  const data = await resp.json();

  // Map DummyJSON -> your products schema
  const incoming = (data.products || []).map((p) => ({
    name: p.title,
    description: p.description || '',
    price: Number(p.price) || 0,
    stock: typeof p.stock === 'number' ? p.stock : 50,
    image_url: (p.images && p.images.length ? p.images[0] : p.thumbnail) || null,
  }));

  if (!incoming.length) {
    console.log('[import] Nothing to import');
    return;
  }

  // Avoid duplicates by name (idempotent import)
  const existingNames = new Set((await knex('products').pluck('name')).map(String));
  const toInsert = incoming.filter((p) => !existingNames.has(p.name));

  if (!toInsert.length) {
    console.log('[import] Skipped — all items already present by name');
    return;
  }

  await knex('products').insert(toInsert);
  console.log(`[import] Inserted ${toInsert.length} products`);
}

main()
  .catch((err) => {
    console.error('[import] Failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await knex.destroy();
  });
