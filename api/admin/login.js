/* POST /api/admin/login — secret-code authentication.
   - Verifies the code server-side via timing-safe compare (env ADMIN_CODE).
   - On success, signs in the configured Chai & Charcha admin Supabase user (env ADMIN_EMAIL/PASSWORD)
     and issues HttpOnly session cookies. Nothing secret ever reaches the client.
   - Best-effort in-memory rate limiting per IP. Generic errors only. */
const { missingEnv, send, safeEqual, setAuthCookies, clearAuthCookies, authClient, readBody } = require('./_lib');

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map(); // ip -> { count, resetAt }

function limiter(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    const fresh = { count: 1, resetAt: now + WINDOW_MS };
    attempts.set(ip, fresh);
    return fresh;
  }
  rec.count += 1;
  return rec;
}

module.exports = async (req, res) => {
  const missing = missingEnv();
  if (missing.length) return send(res, 500, { ok: false, error: 'Server is not configured yet.' });

  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed.' });

  const ip = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (limiter(ip).count > MAX_ATTEMPTS) {
    return send(res, 429, { ok: false, error: 'Too many attempts — kuch der baad try karo.' });
  }

  let body;
  try { body = await readBody(req); } catch {
    return send(res, 400, { ok: false, error: 'Invalid request.' });
  }

  if (!safeEqual(String(body.code || ''), process.env.ADMIN_CODE)) {
    // Generic message — never reveal whether the code exists or its format.
    return send(res, 401, { ok: false, error: 'Invalid code.' });
  }

  try {
    const supabase = authClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    if (error || !data.session) {
      clearAuthCookies(res);
      return send(res, 401, { ok: false, error: 'Invalid code.' });
    }
    setAuthCookies(res, data.session);
    return send(res, 200, { ok: true });
  } catch {
    clearAuthCookies(res);
    return send(res, 401, { ok: false, error: 'Invalid code.' });
  }
};