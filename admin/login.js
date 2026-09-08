/* Admin login — submits the secret code to the serverless verifier.
   Session cookies are set server-side (HttpOnly); nothing is stored here. */
(function () {
  const form = CC.qs('#loginForm');
  const code = CC.qs('#code');
  const err = CC.qs('#err');
  const btn = CC.qs('#submitBtn');

  async function submit(e) {
    e.preventDefault();
    err.hidden = true;
    if (!code.value.trim()) { err.textContent = 'Code daalo.'; err.hidden = false; return; }
    btn.disabled = true;
    btn.textContent = 'Verifying...';
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ code: code.value.trim() }),
      });
      let j = null;
      try { j = await res.json(); } catch { /* noop */ }
      if (res.ok) {
        window.location.href = '/admin/';
        return;
      }
      if (res.status === 429) {
        err.textContent = (j && j.error) || 'Kafi attempts — thori der baad try karo.';
      } else {
        err.textContent = 'Invalid code. Dobara try karo.';
      }
      err.hidden = false;
    } catch (ex) {
      err.textContent = 'Network error — dobara try karo.';
      err.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enter Dashboard ☕';
      code.value = '';
      code.focus();
    }
  }

  form.addEventListener('submit', submit);
})();