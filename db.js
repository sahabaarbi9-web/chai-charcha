/* db.js — initialize the public Supabase (anon-key) client.
   Public values only; loaded once via /api/config (no secrets).
   Exposes window.__CC_DB__ (promise) + window.__CC_SUPABASE__ (client|null). */
(function () {
  const TIMEOUT = 6000;

  const init = (async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT);
      const cfg = await fetch('/api/config', { cache: 'no-store', signal: ctrl.signal }).then((r) => r.json());
      clearTimeout(t);

      if (!cfg || !cfg.configured || !cfg.url || !cfg.anonKey) {
        window.__CC_SUPABASE__ = null;
        return;
      }
      if (typeof supabase === 'undefined') {
        window.__CC_SUPABASE__ = null;
        return;
      }
      window.__CC_SUPABASE__ = supabase.createClient(cfg.url, cfg.anonKey);
    } catch (e) {
      window.__CC_SUPABASE__ = null;
    }
  })();

  window.__CC_DB__ = init;
})();