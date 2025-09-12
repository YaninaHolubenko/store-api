// scripts/init-db.js
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

(async () => {
  const file = path.join(__dirname, '../db/init.sql');
  const sql = fs.readFileSync(file, 'utf8');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, 
  });

  await client.connect();
  await client.query(sql);          
  await client.end();

  console.log('DB init finished');
})().catch((err) => {
  console.error('DB init failed:', err.message);
  process.exit(1);
});
