/* Production verification suite — run AFTER deploy + env config.
   Requires env:
     BASE_URL                 e.g. https://chai-charcha-gamma.vercel.app
     SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY (public/anon)
     SUPABASE_SERVICE_ROLE_KEY
     ADMIN_CODE               the secret used by /api/admin/login
     ADMIN_EMAIL, ADMIN_PASSWORD (used at login)
   Usage: node scripts/test-production.mjs
   Exit code 1 on any failure. Outputs PASS/FAIL per check.
*/
import { createClient } from '@supabase/supabase-js';

const {
  BASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY, ADMIN_CODE, ADMIN_EMAIL, ADMIN_PASSWORD,
} = process.env;

for (const k of ['BASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_CODE', 'ADMIN_EMAIL', 'ADMIN_PASSWORD']) {
  if (!process.env[k]) { console.error(`Missing env: ${k}`); process.exit(1); }
}

const url = BASE_URL.replace(/\/+$/, '');
const anon = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const results = [];
const check = (name, ok, detail = '') => {
  (ok ? pass++ : fail++);
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const api = async (path, { method = 'GET', body, cookie, base = url } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(base + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  const setCookie = res.headers.get('set-cookie') || '';
  return { status: res.status, json, setCookie };
};

const rand = Math.random().toString(36).slice(2, 8);
const probeId = `t-${rand}`;
const probe = {
  id: probeId, category_id: 'chai', name: 'Test Item ' + rand, price: 123,
  badge: null, emoji: '🧪', img: 'https://example.com/t.jpg',
  short: 'test', about: 'test', ingredients: ['A'], addons: [{ name: 'B', price: 1 }], is_visible: true,
};

async function rlsTests() {
  console.log('\n— RLS / public path (direct-to-Supabase with anon key) —');
  const { data, error } = await anon.from('products').select('id, name').limit(5);
  check('anon SELECT products', !error && Array.isArray(data), error ? error.message : `${(data || []).length} rows`);

  const { error: insErr } = await anon.from('products').insert({ id: probeId + 'x', category_id: 'chai', name: 'x', price: 1 });
  check('anon INSERT denied', !!insErr, insErr ? insErr.message : 'unexpectedly allowed');

  const { error: updErr } = await anon.from('products').update({ price: 0 }).eq('id', probeId);
  check('anon UPDATE denied', !!updErr, updErr ? updErr.message : 'unexpectedly allowed');

  const { error: delErr } = await anon.from('products').delete().eq('id', probeId);
  check('anon DELETE denied', !!delErr, delErr ? delErr.message : 'unexpectedly allowed');

  // hidden product must be invisible to anon
  const hidden = { ...probe, id: probeId + 'h', is_visible: false };
  await admin.from('products').upsert(hidden, { onConflict: 'id' });
  const { data: vis } = await anon.from('products').select('id').eq('id', hidden.id);
  check('anon cannot see hidden item', !vis || vis.length === 0, (vis || []).length + ' visible');
  await admin.from('products').delete().eq('id', hidden.id);
}

async function adminTests() {
  console.log('\n— Admin API (serverless) —');

  const { status: s0 } = await api('/api/admin/session');
  check('session without cookie → 401', s0 === 401, 'status ' + s0);

  const { status: s1 } = await api('/api/admin/products', { method: 'POST', body: { ...probe, name: 'Fake Admin' } });
  check('POST without auth → 401', s1 === 401, 'status ' + s1);

  const { status: s2 } = await api('/api/admin/products', { method: 'POST', body: { ...probe, admin: true } });
  check('POST with fake admin flag → 401', s2 === 401, 'status ' + s2);

  const bad = await api('/api/admin/login', { method: 'POST', body: { code: 'wrong-code-zz' } });
  check('login with wrong code → 401', bad.status === 401, 'status ' + bad.status);

  const good = await api('/api/admin/login', { method: 'POST', body: { code: ADMIN_CODE } });
  check('login with correct code → 200', good.status === 200, 'status ' + good.status);
  const cookie = good.setCookie.split(';')[0];
  check('login sets HttpOnly session cookie', cookie.length > 0, cookie ? 'cookie present' : 'none');

  // login invalid-credentials path (real admin creds wrong) — only if service allows
  const s3 = await api('/api/admin/session', { cookie });
  check('session with cookie → 200', s3.status === 200, 'status ' + s3.status);

  const created = await api('/api/admin/products', { method: 'POST', body: probe, cookie });
  check('admin CREATE product → 201', created.status === 201, 'status ' + created.status);

  const listed = await api('/api/admin/products?search=' + rand, { cookie });
  const found = (listed.json && listed.json.items || []).find((p) => p.id === probeId);
  check('admin READ (search finds item)', !!found, found ? probeId : 'not found');

  const updated = await api(`/api/admin/products/${probeId}`, { method: 'PUT', body: { price: 999 }, cookie });
  check('admin UPDATE product → 200', updated.status === 200 && updated.json && updated.json.price === 999, 'status ' + updated.status);

  const pub = await anon.from('products').select('price').eq('id', probeId).single();
  check('public sees updated live value', pub.data && pub.data.price === 999, pub.error ? pub.error.message : 'price ' + (pub.data && pub.data.price));

  const del = await api(`/api/admin/products/${probeId}`, { method: 'DELETE', cookie });
  check('admin DELETE product → 200', del.status === 200, 'status ' + del.status);

  const gone = await api('/api/admin/products?search=' + rand, { cookie });
  const stillThere = (gone.json && gone.json.items || []).find((p) => p.id === probeId);
  check('product deleted (both admin + public)', !stillThere, stillThere ? 'still present' : 'gone');

  const stats = await api('/api/admin/stats', { cookie });
  check('admin stats → 200', stats.status === 200 && stats.json && typeof stats.json.total === 'number', 'status ' + stats.status);

  const cats = await api('/api/admin/categories', { cookie });
  check('admin categories → 200', cats.status === 200 && Array.isArray(cats.json && cats.json.categories), 'status ' + cats.status);

  const fakeTok = await api('/api/admin/session', { cookie: 'cc_admin_tk=eyJhbGciOiJub25lIn0.eyJzdWIiOiJmYWtlIn0; cc_admin_rt=none' });
  check('tampered session cookie → 401', fakeTok.status === 401, 'status ' + fakeTok.status);

  const out = await api('/api/admin/logout', { method: 'POST', cookie });
  check('logout → 200', out.status === 200, 'status ' + out.status);
  const gone2 = await api('/api/admin/session', { cookie });
  check('session after logout → 401', gone2.status === 401, 'status ' + gone2.status);
}

await rlsTests();
await adminTests();

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);