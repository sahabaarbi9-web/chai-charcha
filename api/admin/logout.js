/* POST /api/admin/logout — revokes the session and clears cookies. */
const { missingEnv, send, parseCookies, REFRESH_COOKIE, clearAuthCookies, authClient } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed.' });

  const cookies = parseCookies(req);
  const refresh = cookies[REFRESH_COOKIE];
  if (refresh && !missingEnv().length) {
    try {
      await authClient().auth.signOut({ scope: 'local' }); // revoke this session's tokens
    } catch { /* already invalid — clear cookies regardless */ }
  }
  clearAuthCookies(res);
  return send(res, 200, { ok: true });
};