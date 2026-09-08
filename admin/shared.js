/* Admin dashboard shared helpers (client-side only; all secrets live server-side). */
const CC = (() => {
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function api(path, { method = 'GET', body } = {}) {
    const opts = { method, headers: {}, credentials: 'same-origin' };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(path, opts);
    let json = null;
    try { json = await res.json(); } catch { /* non-json */ }
    if (res.status === 401) {
      window.location.href = '/admin/login.html';
      const e = new Error('unauthorized');
      e.redirected = true;
      throw e;
    }
    if (!res.ok) {
      throw new Error((json && json.error) || `Request failed (${res.status})`);
    }
    return json;
  }

  function toast(msg) {
    const t = qs('#toast');
    if (!t) return alert(msg);
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => t.classList.remove('show'), 3000);
  }

  function busy(el, on) {
    if (!el) return;
    el.disabled = on;
    (el.dataset.label !== undefined ? el : el).classList.toggle('loading', on);
  }

  return { qs, qsa, esc, api, toast, busy };
})();