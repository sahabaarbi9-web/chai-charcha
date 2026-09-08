/* GET/POST /api/admin/products
   GET  — list (search, category filter, badge filter, pagination)
   POST — create a product (admin session required)
*/
const { missingEnv, send, requireAdmin, readBody, validateProduct, listProducts, categoryExists, db } = require('./_lib');

module.exports = async (req, res) => {
  if (missingEnv().length) return send(res, 500, { ok: false, error: 'Server is not configured yet.' });
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const session = await requireAdmin(req, res);
  if (!session) return send(res, 401, { ok: false, error: 'Not authorized.' });

  if (req.method === 'GET') {
    const r = await listProducts(db(), req);
    if (r.error) return send(res, 502, { ok: false, error: 'Database error.' });
    return send(res, 200, {
      ok: true,
      items: r.data,
      total: r.total,
      page: r.page,
      pageSize: r.pageSize,
      totalPages: r.totalPages,
      ...(r.categoryExists !== undefined ? { categoryExists: r.categoryExists } : {}),
    });
  }

  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed.' });

  let body;
  try { body = await readBody(req); } catch {
    return send(res, 400, { ok: false, error: 'Invalid request body.' });
  }

  const { value, error } = validateProduct(body, { partial: false });
  if (error) return send(res, 400, { ok: false, error });

  if (!(await categoryExists(db(), value.category_id))) {
    return send(res, 400, { ok: false, error: 'Unknown category.' });
  }

  const { data, error: insertError } = await db()
    .from('products')
    .insert(value)
    .select('*')
    .single();

  if (insertError) {
    if (/duplicate key value/i.test(insertError.message)) {
      return send(res, 409, { ok: false, error: 'Product with this id already exists.' });
    }
    return send(res, 502, { ok: false, error: 'Database error.' });
  }
  return send(res, 201, { ok: true, item: data });
};