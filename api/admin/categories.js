/* GET /api/admin/categories — category list for filters + product form. */
const { missingEnv, send, requireAdmin, db } = require('./_lib');

module.exports = async (req, res) => {
  if (missingEnv().length) return send(res, 500, { ok: false, error: 'Server is not configured yet.' });
  const session = await requireAdmin(req, res);
  if (!session) return send(res, 401, { ok: false, error: 'Not authorized.' });

  const { data, error } = await db()
    .from('categories')
    .select('id, label, icon, sub, sort_order')
    .order('sort_order', { ascending: true });

  if (error) return send(res, 502, { ok: false, error: 'Database error.' });
  return send(res, 200, { ok: true, categories: data || [] });
};