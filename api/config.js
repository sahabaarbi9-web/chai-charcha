/* GET /api/config — public Supabase connection settings.
   Only the publishable URL + anon (public) key. NEVER the service-role key. */
const { missingEnv, send } = require('./admin/_lib');

module.exports = async (req, res) => {
  const missing = missingEnv();
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
    return send(res, 200, {
      configured: false,
      url: '',
      anonKey: '',
      hint: missing.join(','),
    });
  }
  return send(res, 200, {
    configured: true,
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  });
};