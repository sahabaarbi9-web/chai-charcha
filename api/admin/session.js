/* GET /api/admin/session — session check for the admin dashboard.
   200 { ok:true } when valid, generic 401 otherwise. */
const { missingEnv, send, requireAdmin } = require('./_lib');

module.exports = async (req, res) => {
  if (missingEnv().length) return send(res, 500, { ok: false, error: 'Server is not configured yet.' });
  const session = await requireAdmin(req, res);
  if (!session) return send(res, 401, { ok: false, error: 'Not authorized.' });
  return send(res, 200, { ok: true, user: { email: session.user.email } });
};