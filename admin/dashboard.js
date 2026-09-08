/* Admin dashboard — CRUD against the protected serverless API. */
(function () {
  const state = {
    cats: [],
    items: [],
    filters: { search: '', cat: '', badge: '' },
    page: 1,
    pageSize: 50,
    editing: null,
  };

  const $ = CC.qs;
  const $$ = CC.qsa;

  function showAlert(msg, kind = 'error') {
    const a = $('#alert');
    a.textContent = msg;
    a.className = 'alert ' + (kind === 'error' ? 'alert-err' : 'alert-ok');
    a.hidden = false;
  }
  function hideAlert() { $('#alert').hidden = true; }

  function openModal() {
    $('#formModal').hidden = false;
    document.body.classList.add('modal-open');
    if (state.editing) $('#p_name').focus();
  }
  function closeModal() {
    $('#formModal').hidden = true;
    $('#delModal').hidden = true;
    document.body.classList.remove('modal-open');
  }

  /* ---- loaders ---- */
  async function loadStats() {
    const j = await CC.api('/api/admin/stats', { method: 'GET' });
    $('#stTotal').textContent = j.total;
    $('#stVisible').textContent = j.visible;
    $('#stPopular').textContent = j.popular;
    $('#stAvg').textContent = j.avgPrice;
    const map = new Map(j.categories.map((c) => [c.id, c]));
    $('#catFilter').innerHTML = '<option value="">All categories</option>' +
      [...map.values()].map((c) => `<option value="${CC.esc(c.id)}">${CC.esc(c.icon)} ${CC.esc(c.label)}</option>`).join('');
  }

  async function loadCategories() {
    const j = await CC.api('/api/admin/categories', { method: 'GET' });
    state.cats = j.categories || [];
    $('#p_cat').innerHTML = state.cats.map((c) => `<option value="${CC.esc(c.id)}">${CC.esc(c.icon)} ${CC.esc(c.label)}</option>`).join('');
  }

  async function loadItems() {
    const p = new URLSearchParams({ page: String(state.page), pageSize: String(state.pageSize) });
    if (state.filters.search) p.set('search', state.filters.search);
    if (state.filters.cat) p.set('cat', state.filters.cat);
    if (state.filters.badge) p.set('badge', state.filters.badge);
    const j = await CC.api('/api/admin/products?' + p.toString(), { method: 'GET' });
    state.items = j.items || [];
    renderTable();
    renderPager(j);
  }

  /* ---- render ---- */
  function renderPager(j) {
    const pg = $('#pager');
    if (!j.totalPages || j.totalPages <= 1) { pg.innerHTML = ''; return; }
    pg.innerHTML = `
      <button class="btn btn-ghost btn-sm" data-pg="${Math.max(1, j.page - 1)}" ${j.page <= 1 ? 'disabled' : ''}>‹ Prev</button>
      <span>Page ${j.page} / ${j.totalPages} · ${j.total} items</span>
      <button class="btn btn-ghost btn-sm" data-pg="${Math.min(j.totalPages, j.page + 1)}" ${j.page >= j.totalPages ? 'disabled' : ''}>Next ›</button>`;
    $$('button[data-pg]', pg).forEach((b) => b.addEventListener('click', () => {
      state.page = Number(b.dataset.pg);
      loadItems();
    }));
  }

  function renderTable() {
    const tb = $('#tbody');
    tb.innerHTML = state.items.map((p) => `
      <tr>
        <td class="cell-img">${p.img ? `<img src="${CC.esc(p.img)}" alt="" loading="lazy">` : '—'}</td>
        <td><strong>${CC.esc(p.name)}</strong><br><small class="muted">${CC.esc(p.id)}</small></td>
        <td>${CC.esc((p.category_id || ''))}</td>
        <td>Rs. ${p.price}</td>
        <td>${p.badge ? `<span class="badge-pill">${CC.esc(p.badge)}</span>` : '—'}</td>
        <td>${p.is_visible ? '<span class="ok">visible</span>' : '<span class="no">hidden</span>'}</td>
        <td class="cell-actions">
          <button class="btn btn-ghost btn-sm" data-edit="${CC.esc(p.id)}">Edit</button>
          <button class="btn btn-ghost btn-sm danger" data-del="${CC.esc(p.id)}">&times;</button>
        </td>
      </tr>`).join('');
    $('#empty').hidden = state.items.length > 0;
  }

  /* ---- form ---- */
  function fillForm(p) {
    $('#p_name').value = p.name || '';
    $('#p_cat').value = p.category_id || state.cats[0]?.id || '';
    $('#p_price').value = p.price ?? '';
    $('#p_badge').value = p.badge || '';
    $('#p_emoji').value = p.emoji || '☕';
    $('#p_sort').value = p.sort_order ?? 0;
    $('#p_img').value = p.img || '';
    $('#p_short').value = p.short || '';
    $('#p_about').value = p.about || '';
    $('#p_ingredients').value = (p.ingredients || []).join('\n');
    $('#p_addons').value = (p.addons || []).map((a) => `${a.name}|${a.price}`).join('\n');
    $('#p_visible').checked = p.is_visible !== false;
  }

  function readForm() {
    const lines = (v) => v.split('\n').map((s) => s.trim()).filter(Boolean);
    const addons = [];
    for (const ln of lines($('#p_addons').value)) {
      const m = ln.split('|');
      addons.push({ name: (m[0] || '').trim(), price: Math.max(0, parseInt(m[1], 10) || 0) });
    }
    return {
      name: $('#p_name').value.trim(),
      category_id: $('#p_cat').value,
      price: parseInt($('#p_price').value, 10),
      badge: $('#p_badge').value || null,
      emoji: $('#p_emoji').value.trim() || '☕',
      sort_order: parseInt($('#p_sort').value, 10) || 0,
      img: $('#p_img').value.trim(),
      short: $('#p_short').value.trim(),
      about: $('#p_about').value.trim(),
      ingredients: lines($('#p_ingredients').value),
      addons,
      is_visible: $('#p_visible').checked,
    };
  }

  async function askSave(e) {
    e.preventDefault();
    const body = readForm();
    if (!body.name || !body.category_id || !Number.isFinite(body.price)) {
      showAlert('Name, category aur price zaroori hain.');
      return;
    }
    const btn = $('#saveBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
      if (state.editing) {
        await CC.api(`/api/admin/products/${encodeURIComponent(state.editing)}`, { method: 'PUT', body });
      } else {
        body.id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        await CC.api('/api/admin/products', { method: 'POST', body });
      }
      CC.toast('Saved ✓');
      closeModal();
      await Promise.all([loadStats(), loadItems()]);
    } catch (ex) {
      showAlert(ex.message || 'Save failed.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save item';
    }
  }

  async function askEdit(id) {
    const p = state.items.find((x) => x.id === id);
    if (!p) return;
    state.editing = id;
    $('#formTitle').textContent = 'Edit — ' + p.name;
    fillForm(p);
    openModal();
  }

  function newItem() {
    state.editing = null;
    $('#formTitle').textContent = 'Add item';
    fillForm({});
    openModal();
  }

  let delTarget = null;
  function askDelete(id) {
    delTarget = id;
    $('#delModal').hidden = false;
    const p = state.items.find((x) => x.id === id);
    CC.qs('.del-note', $('#delModal')).textContent = `"${p ? p.name : id}" puri tarah delete ho jayega.`;
  }

  async function confirmDelete() {
    if (!delTarget) return;
    const btn = $('#delConfirm');
    btn.disabled = true;
    try {
      await CC.api(`/api/admin/products/${encodeURIComponent(delTarget)}`, { method: 'DELETE' });
      CC.toast('Deleted ✓');
      delTarget = null;
      closeModal();
      await Promise.all([loadStats(), loadItems()]);
    } catch (ex) {
      showAlert(ex.message || 'Delete failed.');
    } finally {
      btn.disabled = false;
      closeModal();
    }
  }

  /* ---- events ---- */
  function bind() {
    $('#logoutBtn').addEventListener('click', async () => {
      try { await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }); } catch { /* ignore */ }
      window.location.href = '/admin/login.html';
    });
    $('#addBtn').addEventListener('click', newItem);
    $('#formClose').addEventListener('click', closeModal);
    $('#cancelBtn').addEventListener('click', closeModal);
    $('#delCancel').addEventListener('click', closeModal);
    $('#delConfirm').addEventListener('click', confirmDelete);
    $('#formModal').addEventListener('click', (e) => { if (e.target.id === 'formModal') closeModal(); });
    $('#delModal').addEventListener('click', (e) => { if (e.target.id === 'delModal') closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    $('#itemForm').addEventListener('submit', askSave);

    let deb;
    $('#search').addEventListener('input', (e) => {
      clearTimeout(deb);
      deb = setTimeout(() => { state.filters.search = e.target.value.trim(); state.page = 1; loadItems(); }, 350);
    });
    $('#catFilter').addEventListener('change', (e) => { state.filters.cat = e.target.value; state.page = 1; loadItems(); });
    $('#badgeFilter').addEventListener('change', (e) => { state.filters.badge = e.target.value; state.page = 1; loadItems(); });

    $('#tbody').addEventListener('click', (e) => {
      const ed = e.target.closest('[data-edit]');
      const del = e.target.closest('[data-del]');
      if (ed) askEdit(ed.dataset.edit);
      else if (del) askDelete(del.dataset.del);
    });
  }

  async function boot() {
    // Guard: redirect to login if no valid session.
    try {
      await CC.api('/api/admin/session', { method: 'GET' });
    } catch (e) {
      if (e.redirected) return;
      showAlert('Not authorized.');
      return;
    }
    try {
      await Promise.all([loadCategories(), loadStats(), loadItems()]);
    } catch (e) {
      showAlert(e.message || 'Initial load failed.');
    }
  }

  document.addEventListener('DOMContentLoaded', () => { bind(); boot(); });
})();