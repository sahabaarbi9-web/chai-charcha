/* GET /api/admin/stats — dashboard statistics. */
const { missingEnv, send, requireAdmin, db } = require('./_lib');

module.exports = async (req, res) => {
  if (missingEnv().length) return send(res, 500, { ok: false, error: 'Server is not configured yet.' });
  const session = await requireAdmin(req, res);
  if (!session) return send(res, 401, { ok: false, error: 'Not authorized.' });

  const supabase = db();
  const total = await supabase.from('products').select('id', { count: 'exact', head: true });
  if (total.error) return send(res, 502, { ok: false, error: 'Database error.' });

  const visible = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_visible', true);
  const popular = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('badge', 'popular');
  const cats = await supabase.from('categories').select('id, label, icon', { count: 'exact' }).order('sort_order', { ascending: true });
  const price = await supabase.from('products').select('price');

  let avgPrice = 0;
  if (!price.error && Array.isArray(price.data) && price.data.length) {
    avgPrice = Math.round(price.data.reduce((s, p) => s + p.price, 0) / price.data.length);
  }

  const byCategory = {};
  if (!cats.error && Array.isArray(cats.data)) {
    const { data: rows } = await supabase.from('products').select('category_id');
    for (const c of cats.data) byCategory[c.id] = 0;
    if (!rows.error) for (const r of rows) if (byCategory[r.category_id] !== undefined) byCategory[r.category_id] += 1;
  }

  return send(res, 200, {
    ok: true,
    total: total.count || 0,
    visible: visible.error ? null : visible.count || 0,
    hidden: total.count - (visible.error ? total.count : visible.count || 0),
    popular: popular.error ? null : popular.count || 0,
    avgPrice,
    categories: cats.error ? [] : (cats.data || []).map((c) => ({ id: c.id, label: c.label, icon: c.icon, count: byCategory[c.id] || 0 })),
  });
};