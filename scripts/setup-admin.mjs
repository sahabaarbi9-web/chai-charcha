/* Create (or ensure) the Supabase Auth admin user used by the admin dashboard.
   Credentials are supplied ONLY via env vars — never in code or the repo.
   Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
   Usage: node scripts/setup-admin.mjs
*/
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data, error } = await db.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'admin' },
  });

  if (error) {
    if (/already been registered|already registered/i.test(error.message)) {
      console.log('Admin user already exists for ' + ADMIN_EMAIL + ' (ok — credentials live in Vercel env).');
      return;
    }
    throw error;
  }

  console.log('Admin user created: ' + data.user.email);
  console.log('Email: keep ADMIN_EMAIL/ADMIN_PASSWORD as Vercel env vars — never share these.');
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('setup-admin failed:', e && e.message ? e.message : e);
  process.exit(1);
});