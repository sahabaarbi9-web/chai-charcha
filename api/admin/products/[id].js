/* PUT/DELETE /api/admin/products/:id  (admin session required) */
const { missingEnv, send, requireAdmin, readBody, validateProduct, categoryExists, db } = require('../_lib');

module.exports = async (req, res) => {
  if (missingEnv().length) return send(res, 500, { ok: false, error: 'Server is not configured yet.' });
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const session = await requireAdmin(req, res);
  if (!session) return send(res, 401, { ok: false, error: 'Not authorized.' });

  const id = String(req.query?.id ?? '').trim();
  if (!id) return send(res, 400, { ok: false, error: 'Product id is required.' });

  const supabase = db();

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return send(res, 502, { ok: false, error: 'Database error.' });
    return send(res, 200, { ok: true, deleted: id });
  }

  if (req.method !== 'PUT') return send(res, 405, { ok: false, error: 'Method not allowed.' });

  let body;
  try { body = await readBody(req); } catch {
    return send(res, 400, { ok: false, error: 'Invalid request body.' });
  }

  const { value, error } = validateProduct({ ...body, id }, { partial: true });
  if (error) return send(res, 400, { ok: false, error });

  if (value.category_id && !(await categoryExists(supabase, value.category_id))) {
    return send(res, 400, { ok: false, error: 'Unknown category.' });
  }

  const { data, error: updateError } = await supabase
    .from('products')
    .update(value)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (updateError) return send(res, 502, { ok: false, error: 'Database error.' });
  if (!data) return send(res, 404, { ok: false, error: 'Product not found.' });
  return send(res, 200, { ok: true, item: data });
};