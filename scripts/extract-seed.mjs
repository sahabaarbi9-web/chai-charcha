/* Extract CATS + MENU from app.js into data/menu.seed.json (reproducible snapshot). */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appjs = join(__dirname, '..', 'app.js');
const dataDir = join(__dirname, '..', 'data');
const out = join(dataDir, 'menu.seed.json');

const src = readFileSync(appjs, 'utf8');

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  document: {
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
  },
};
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'app.js' });
const { CATS: CATS, MENU: MENU } = vm.runInContext('({ CATS, MENU })', sandbox);

if (!MENU || !Array.isArray(MENU)) throw new Error('MENU not found in app.js');
if (!CATS || typeof CATS !== 'object') throw new Error('CATS not found in app.js');

const categories = Object.entries(CATS).map(([id, c], i) => ({
  id,
  label: c.label,
  icon: c.icon,
  sub: c.sub,
  sort_order: i,
}));

const products = MENU.map((m) => ({
  id: m.id,
  category_id: m.cat,
  name: m.name,
  price: m.price,
  badge: m.badge ?? null,
  emoji: m.emoji,
  img: m.img,
  short: m.short,
  about: m.about,
  ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
  addons: Array.isArray(m.addons) ? m.addons : [],
  is_visible: true,
}));

// Validation — every product must reference an existing category.
const catIds = new Set(categories.map((c) => c.id));
const orphans = products.filter((p) => !catIds.has(p.category_id)).map((p) => p.id);
if (orphans.length) throw new Error('Orphan products (no category): ' + orphans.join(', '));

// Preserve the exact intra-category order shown on the menu.
for (const name of catIds) {
  products.filter((p) => p.category_id === name).forEach((p, i) => { p.sort_order = i; });
}

const dupIds = products.map((p) => p.id).filter((id, i, a) => a.indexOf(id) !== i);
if (dupIds.length) throw new Error('Duplicate product ids: ' + dupIds.join(', '));

mkdirSync(dataDir, { recursive: true });
writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), categories, products }, null, 2));

console.log(`Seed written: ${out}`);
console.log(`  categories: ${categories.length}`);
console.log(`  products:   ${products.length}`);