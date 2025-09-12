// Link categories to existing products by matching names against DummyJSON.
// Comments are in English only.

require('dotenv').config();
const knexConfig = require('../knexfile.js');
const knex = require('knex')(knexConfig.development);

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

function lc(s) {
  return (s || '').toString().trim().toLowerCase();
}

async function main() {
  console.log('[link] start, DB =', process.env.PG_DATABASE);

  // 1) Load DummyJSON products -> map: productNameLower => categorySlugLower
  console.log('[link] fetching DummyJSON...');
  const resp = await fetchFn('https://dummyjson.com/products?limit=200');
  if (!resp.ok) throw new Error(`DummyJSON HTTP ${resp.status}`);
  const dj = await resp.json();
  const mapNameToCat = new Map();
  for (const p of dj.products || []) {
    const name = lc(p.title);
    const cat  = lc(p.category);
    if (name && cat) mapNameToCat.set(name, cat);
  }
  console.log('[link] dummy products loaded:', mapNameToCat.size);

  // 2) Load categories from DB -> catNameLower => id
  //    (we only rely on categories.name)
  const cats = await knex('categories').select('id', 'name');
  const catIdByName = new Map();
  cats.forEach((c) => {
    if (c.name) catIdByName.set(lc(c.name), c.id);
  });
  console.log('[link] db categories:', cats.length);

  // 3) Load products that have NULL category_id
  const rows = await knex('products')
    .select('id', 'name', 'category_id')
    .whereNull('category_id');

  console.log('[link] products without category:', rows.length);
  if (!rows.length) {
    console.log('[link] nothing to update, done.');
    return;
  }

  let matched = 0;
  let updated = 0;

  // 4) For each product: find categoryId by DummyJSON title and update
  for (const r of rows) {
    const pname = lc(r.name);
    const catSlug = mapNameToCat.get(pname);
    if (!catSlug) continue;

    const catId = catIdByName.get(catSlug);
    if (!catId) continue;

    matched++;
    await knex('products').where({ id: r.id }).update({ category_id: catId });
    updated++;
  }

  console.log(`[link] matched by name: ${matched}, updated: ${updated}`);
  console.log('[link] done');
}

main()
  .catch((e) => {
    console.error('[link] failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await knex.destroy();
  });
