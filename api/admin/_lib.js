/* Shared helpers for admin API endpoints (Vercel serverless, Node runtime).
   All secrets stay in process.env — never reach the browser. */
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

const ACCESS_COOKIE = 'cc_admin_tk';
const REFRESH_COOKIE = 'cc_admin_rt';
const ADMIN_PREFIX = '/api/admin';

function missingEnv() {
  return ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_CODE', 'ADMIN_EMAIL', 'ADMIN_PASSWORD']
    .filter((k) => !process.env[k]);
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  return res.end(JSON.stringify(obj));
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function cookieSecure() {
  return process.env.COOKIE_SECURE === 'false' ? '' : '; Secure';
}

function setAuthCookies(res, { access_token, refresh_token }) {
  const secure = cookieSecure();
  res.setHeader('Set-Cookie', [
    `${ACCESS_COOKIE}=${access_token}; Path=${ADMIN_PREFIX}; HttpOnly; SameSite=Lax; Max-Age=3600${secure}`,
    `${REFRESH_COOKIE}=${refresh_token}; Path=${ADMIN_PREFIX}; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`,
  ]);
}

function clearAuthCookies(res) {
  const secure = cookieSecure();
  res.setHeader('Set-Cookie', [
    `${ACCESS_COOKIE}=; Path=${ADMIN_PREFIX}; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
    `${REFRESH_COOKIE}=; Path=${ADMIN_PREFIX}; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  ]);
}

/* Constant-time code comparison (hashed to equalize length). */
function safeEqual(input, expected) {
  if (!input || !expected) return false;
  const a = crypto.createHash('sha256').update(String(expected)).digest();
  const b = crypto.createHash('sha256').update(String(input)).digest();
  return crypto.timingSafeEqual(a, b);
}

function db() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function authClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/* Verify / refresh the admin session from HttpOnly cookies.
   Returns { user } or null (generic failure — no details leaked). */
async function requireAdmin(req, res) {
  const c = parseCookies(req);
  const access = c[ACCESS_COOKIE];
  const refresh = c[REFRESH_COOKIE];
  if (!access || !refresh) return null;

  const supabase = authClient();
  let user = null;

  try {
    const { data, error } = await supabase.auth.getUser(access);
    if (!error && data && data.user) user = data.user;
  } catch { /* fall through to refresh */ }

  if (!user) {
    try {
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refresh });
      if (error || !data.session || !data.user) return null;
      user = data.user;
      setAuthCookies(res, data.session); // slide the session
    } catch {
      return null;
    }
  }

  // Authorization: the signed-in user MUST be the configured admin.
  if (!user.email || user.email.toLowerCase() !== String(process.env.ADMIN_EMAIL).toLowerCase()) {
    return null;
  }
  return { user };
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 100_000) {
      const e = new Error('Request body too large.');
      e.status = 413;
      throw e;
    }
    chunks.push(c);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch {
    const e = new Error('Invalid JSON body.');
    e.status = 400;
    throw e;
  }
}

const MAX_TEXT = { name: 120, emoji: 16, img: 2000, short: 500, about: 2000, category_id: 60, badge: 16 };

const PRODUCT_FIELDS = new Set(['id', 'category_id', 'name', 'price', 'badge', 'emoji', 'img', 'short', 'about', 'ingredients', 'addons', 'is_visible', 'sort_order']);

function cleanStr(v, max) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (s.length > max) return null;
  return s;
}

/* Sanitize + validate a product payload. { partial:true } allows missing fields.
   Returns { value } or { error }. */
function validateProduct(body, { partial = false } = {}) {
  const value = {};
  const set = (k, v) => { value[k] = v; };

  if (body.id !== undefined) {
    const id = cleanStr(body.id, 40);
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) return { error: 'Invalid id (letters, digits, - and _ only).' };
    set('id', id);
  } else if (!partial) {
    return { error: 'id is required.' };
  }

  if (body.category_id !== undefined) {
    const cat = cleanStr(body.category_id, MAX_TEXT.category_id);
    if (!cat) return { error: 'category_id is required for all products.' };
    set('category_id', cat);
  } else if (!partial) {
    return { error: 'category_id is required.' };
  }

  if (body.name !== undefined) {
    const name = cleanStr(body.name, MAX_TEXT.name);
    if (!name) return { error: 'name is required.' };
    set('name', name);
  } else if (!partial) {
    return { error: 'name is required.' };
  }

  if (body.price !== undefined) {
    const price = body.price;
    if (!Number.isInteger(Number(price)) || Number(price) < 0 || Number(price) > 1_000_000) {
      return { error: 'price must be an integer between 0 and 1000000.' };
    }
    set('price', Number(price));
  } else if (!partial) {
    return { error: 'price is required.' };
  }

  if (body.badge !== undefined) {
    if (body.badge !== null && !['popular', 'new'].includes(body.badge)) return { error: 'badge must be popular, new or null.' };
    set('badge', body.badge);
  }

  for (const k of ['emoji', 'short', 'about', 'img']) {
    if (body[k] !== undefined) {
      const v = cleanStr(body[k], MAX_TEXT[k]);
      if (v === null) return { error: `Invalid ${k}.` };
      set(k, v);
    }
  }

  if (body.ingredients !== undefined) {
    if (!Array.isArray(body.ingredients) || body.ingredients.length > 40 ||
        body.ingredients.some((i) => typeof i !== 'string' || i.trim().length === 0 || i.trim().length > 100)) {
      return { error: 'ingredients must be an array of 1-100 char strings (max 40).' };
    }
    set('ingredients', body.ingredients.map((i) => i.trim()));
  }

  if (body.addons !== undefined) {
    if (!Array.isArray(body.addons) || body.addons.length > 25) return { error: 'addons must be an array (max 25).' };
    for (const a of body.addons) {
      if (!a || typeof a !== 'object' || typeof a.name !== 'string' || a.name.trim().length === 0 || a.name.trim().length > 80) {
        return { error: 'Each addon needs a name (max 80 chars).' };
      }
      if (!Number.isInteger(Number(a.price)) || Number(a.price) < 0 || Number(a.price) > 1_000_000) {
        return { error: 'Each addon price must be an integer >= 0.' };
      }
    }
    set('addons', body.addons.map((a) => ({ name: a.name.trim(), price: Number(a.price) })));
  }

  if (body.is_visible !== undefined) {
    if (typeof body.is_visible !== 'boolean') return { error: 'is_visible must be a boolean.' };
    set('is_visible', body.is_visible);
  }

  if (body.sort_order !== undefined) {
    if (!Number.isInteger(Number(body.sort_order))) return { error: 'sort_order must be an integer.' };
    set('sort_order', Number(body.sort_order));
  }

  // Reject unknown fields outright (never accept client-supplied roles/flags).
  for (const k of Object.keys(body)) {
    if (!PRODUCT_FIELDS.has(k) && body[k] !== undefined) {
      const e = new Error(`Unexpected field: ${k}`);
      e.status = 400;
      throw e;
    }
  }

  return { value };
}

/* GET /api/admin/products — search / filter / paginate. */
async function listProducts(dbClient, req) {
  const q = req.url ? new URL(req.url, 'http://x').searchParams : new URLSearchParams();
  let query = dbClient.from('products').select('*', { count: 'exact' });

  const search = cleanStr(q.get('search'), 120);
  if (search) query = query.ilike('name', `%${search}%`);
  const cat = cleanStr(q.get('cat'), 60);
  if (cat) query = query.eq('category_id', cat);
  const badge = q.get('badge');
  if (badge === 'popular' || badge === 'new') query = query.eq('badge', badge);
  if (q.get('visible') === 'true') query = query.eq('is_visible', true);
  if (q.get('visible') === 'false') query = query.eq('is_visible', false);

  const page = Math.max(1, parseInt(q.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(q.get('pageSize') || '50', 10) || 50));

  query = query.order('sort_order', { ascending: true }).order('created_at', { ascending: true });

  const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) return { error };

  if (cat && !data.length) {
    // report whether the category itself exists (useful UI feedback)
    const { data: c } = await dbClient.from('categories').select('id').eq('id', cat).maybeSingle();
    return { data, count, total: count ?? 0, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize), categoryExists: Boolean(c) };
  }
  return { data, count, total: count ?? 0, page, pageSize, totalPages: Math.ceil((count || 0) / pageSize) };
}

async function categoryExists(dbClient, id) {
  const { data } = await dbClient.from('categories').select('id').eq('id', id).maybeSingle();
  return Boolean(data);
}

module.exports = {
  ACCESS_COOKIE, REFRESH_COOKIE, ADMIN_PREFIX,
  missingEnv, send, parseCookies, safeEqual,
  setAuthCookies, clearAuthCookies, requireAdmin, readBody,
  validateProduct, listProducts, categoryExists, db, authClient,
};