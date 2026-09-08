/* Safe, non-destructive upsert of data/menu.seed.json into Supabase.
   - Upserts by primary key (no duplicates possible).
   - Never deletes rows that exist in the DB but not in the seed (keeps admin-created items).
   Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   Usage: node scripts/import-menu.mjs
*/
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (set via .env or environment).');
  process.exit(1);
}

const seedPath = join(__dirname, '..', 'data', 'menu.seed.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsert(table, rows, onConflict) {
  if (!rows.length) return { count: 0 };
  const { error } = await db.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  return { count: rows.length };
}

async function main() {
  const { count: catCount } = await upsert('categories', seed.categories, 'id');
  const { count: prodCount } = await upsert('products', seed.products, 'id');
  console.log(`Upserted ${catCount} categories, ${prodCount} products.`);

  const { data: cats, error: catErr } = await db.from('categories').select('id');
  if (catErr) throw catErr;
  const { data: prods, error: prodErr } = await db.from('products').select('id, category_id, name');
  if (prodErr) throw prodErr;

  console.log(`DB totals after import: ${cats.length} categories, ${prods.length} products.`);

  const catIds = new Set(cats.map((c) => c.id));
  const orphans = prods.filter((p) => !catIds.has(p.category_id)).map((p) => p.id);
  if (orphans.length) {
    console.warn(`WARNING: orphaned products without a category: ${orphans.join(', ')}`);
  } else {
    console.log('Referential integrity: OK (every product maps to an existing category).');
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('Import failed:', e && e.message ? e.message : e);
  process.exit(1);
});