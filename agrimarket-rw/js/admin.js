// ============================================================
// AgriMarket RW — Admin Panel Logic
// ============================================================

let adminUser = null;

// ============================================================
// HELPERS
// ============================================================
function adEsc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function adFormatPrice(n) {
  return Number(n || 0).toLocaleString('en-RW') + ' RWF';
}

function adFormatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch { return d; }
}

function adToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return alert(msg);
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 3000);
}

// ============================================================
// TAB SWITCHING
// ============================================================
function showAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.admin-panel').forEach(p =>
    p.classList.toggle('active', p.id === 'panel-' + tab));

  switch (tab) {
    case 'overview':  loadOverview();  break;
    case 'users':     loadUsers();     break;
    case 'products':  loadAdminProducts(); break;
    case 'orders':    loadAdminOrders();   break;
    case 'analytics': loadAnalytics(); break;
  }
}

// ============================================================
// OVERVIEW
// ============================================================
async function loadOverview() {
  try {
    const data = await API.adminOverview();
    const s = data.stats || {};
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

    set('ovUsers',    s.users || 0);
    set('ovFarmers',  s.farmers || 0);
    set('ovBuyers',   s.buyers || 0);
    set('ovProducts', s.products || 0);
    set('ovOrders',   s.orders || 0);
    set('ovPending',  s.pendingOrders || 0);
    set('ovRevenue',  adFormatPrice(s.revenue || 0));
  } catch (err) {
    adToast(err.message, 'error');
  }
}

// ============================================================
// USERS
// ============================================================
async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">Turashakisha...</td></tr>';

  const role   = document.getElementById('userRoleFilter')?.value   || 'all';
  const search = document.getElementById('userSearch')?.value        || '';

  try {
    const data = await API.adminGetUsers({ role, search });
    const users = data.users || [];

    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#888;">Nta bakoresha babonetse</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => {
      const isSuspended = (u.status || 'active') === 'suspended';
      const statusBadge = isSuspended
        ? '<span class="badge badge-danger">Yahagaritswe</span>'
        : '<span class="badge badge-success">Active</span>';

      const roleBadge =
        u.role === 'admin'  ? '<span class="badge badge-info">Admin</span>'    :
        u.role === 'farmer' ? '<span class="badge badge-success">Umuhinzi</span>':
                              '<span class="badge" style="background:#e3f2fd;color:#1565c0;">Umuguzi</span>';

      const toggleLabel = isSuspended ? 'Tangiza' : 'Hagarika';
      const toggleCls   = isSuspended ? 'btn-primary' : 'btn-danger';
      const isSelf      = adminUser && u.id === adminUser.id;

      return `<tr>
        <td><strong>${adEsc(u.name)}</strong></td>
        <td>${adEsc(u.email)}</td>
        <td>${adEsc(u.phone || '—')}</td>
        <td>${adEsc(u.district || '—')}</td>
        <td>${roleBadge}</td>
        <td>${statusBadge}</td>
        <td>
          ${!isSelf && u.role !== 'admin' ? `
            <button class="btn btn-sm ${toggleCls}" data-toggle-user="${adEsc(u.id)}" data-status="${isSuspended ? 'active' : 'suspended'}">
              ${toggleLabel}
            </button>
            <button class="btn btn-sm btn-danger" data-delete-user="${adEsc(u.id)}" title="Siba">
              <i class="fas fa-trash"></i>
            </button>` : '<small style="color:#aaa;">—</small>'}
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#e53935;">Error: ${adEsc(err.message)}</td></tr>`;
  }
}

async function adminToggleUser(id, status) {
  const verb = status === 'suspended' ? 'guhagarika' : 'gutangiza';
  if (!confirm(`Uzi neza ko ushaka ${verb} uyu mukoresha?`)) return;
  try {
    await API.adminUserStatus(id, status);
    adToast('Status yahinduwe');
    loadUsers();
  } catch (err) { adToast(err.message, 'error'); }
}

async function adminDeleteUser(id) {
  if (!confirm('Uzi neza? Ibi bizasiba umukoresha n\'ibicuruzwa bye byose.')) return;
  try {
    await API.adminDeleteUser(id);
    adToast('Umukoresha yasibwe');
    loadUsers();
    loadOverview();
  } catch (err) { adToast(err.message, 'error'); }
}

// ============================================================
// PRODUCTS
// ============================================================
async function loadAdminProducts() {
  const tbody = document.getElementById('adminProductsBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">Turashakisha...</td></tr>';

  const status   = document.getElementById('prodStatusFilter')?.value || 'all';
  const category = document.getElementById('prodCatFilter')?.value    || 'all';

  try {
    const data = await API.adminGetProducts({ status, category });
    const products = data.products || [];

    if (!products.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#888;">Nta bicuruzwa byabonetse</td></tr>';
      return;
    }

    tbody.innerHTML = products.map(p => {
      const s = p.status || 'active';
      const badge =
        s === 'suspended' ? '<span class="badge badge-danger">Yahagaritswe</span>' :
        s === 'sold_out'  ? '<span class="badge badge-warning">Byashize</span>'    :
                            '<span class="badge badge-success">Active</span>';

      const actions = [];
      if (s !== 'active') {
        actions.push(`<button class="btn btn-sm btn-primary" data-prod-status="${adEsc(p.id)}" data-status="active" title="Tangiza"><i class="fas fa-check"></i></button>`);
      }
      if (s !== 'suspended') {
        actions.push(`<button class="btn btn-sm btn-danger" data-prod-status="${adEsc(p.id)}" data-status="suspended" title="Hagarika"><i class="fas fa-ban"></i></button>`);
      }
      actions.push(`<button class="btn btn-sm btn-danger" data-delete-product="${adEsc(p.id)}" title="Siba" style="background:#b71c1c;"><i class="fas fa-trash"></i></button>`);

      return `<tr>
        <td>${adEsc(p.icon || '🌾')} <strong>${adEsc(p.name)}</strong></td>
        <td>${adEsc(p.category)}</td>
        <td>${adEsc(p.farmerName)}</td>
        <td>${adFormatPrice(p.price)} / ${adEsc(p.unit)}</td>
        <td>${p.quantity}</td>
        <td>${badge}</td>
        <td style="white-space:nowrap;">${actions.join(' ')}</td>
      </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#e53935;">Error: ${adEsc(err.message)}</td></tr>`;
  }
}

async function adminProductStatus(id, status) {
  try {
    await API.adminProductStatus(id, status);
    adToast('Status yahinduwe');
    loadAdminProducts();
  } catch (err) { adToast(err.message, 'error'); }
}

async function adminDeleteProduct(id) {
  if (!confirm('Uzi neza ko ushaka gusiba iki gicuruzwa?')) return;
  try {
    await API.deleteProduct(id); // uses products.php delete (admin allowed)
    adToast('Igicuruzwa cyasibwe');
    loadAdminProducts();
  } catch (err) { adToast(err.message, 'error'); }
}

// ============================================================
// ORDERS
// ============================================================
async function loadAdminOrders() {
  const c = document.getElementById('adminOrdersList');
  if (!c) return;
  c.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Turashakisha...</p></div>';

  const status = document.getElementById('orderStatusFilter')?.value || '';

  try {
    const data = await API.adminGetOrders(status === 'all' ? '' : status);
    const orders = data.orders || [];

    if (!orders.length) {
      c.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">Nta orders zirahari</div>';
      return;
    }

    c.innerHTML = orders.map(o => {
      const statusMap = {
        pending:   { label: 'Itegereje',    cls: 'badge-warning' },
        confirmed: { label: 'Yemejwe',      cls: 'badge-info' },
        delivered: { label: 'Yatanzwe',     cls: 'badge-success' },
        cancelled: { label: 'Yahagaritswe', cls: 'badge-danger' }
      };
      const s = statusMap[o.status] || { label: o.status, cls: '' };

      const items = o.items.map(i =>
        `<li>${adEsc(i.icon || '🌾')} ${adEsc(i.name)} — ${i.qty} × ${adFormatPrice(i.price)}</li>`
      ).join('');

      return `<div class="order-card">
        <div class="order-header">
          <div>
            <strong>Order #${adEsc(o.id.slice(-8))}</strong>
            <span class="badge ${s.cls}" style="margin-left:10px;">${s.label}</span>
          </div>
          <small>${adFormatDate(o.createdAt)}</small>
        </div>
        <div class="order-meta">
          <span><i class="fas fa-user"></i> ${adEsc(o.userName)}</span>
          <span><i class="fas fa-phone"></i> ${adEsc(o.userPhone)}</span>
        </div>
        <ul style="margin:12px 0 12px 20px;color:#555;font-size:.9rem;">${items}</ul>
        <div class="order-footer">
          <strong>Igiteranyo: <span style="color:var(--primary-dark);">${adFormatPrice(o.total)}</span></strong>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    c.innerHTML = `<p style="color:#e53935;">Error: ${adEsc(err.message)}</p>`;
  }
}

// ============================================================
// ANALYTICS
// ============================================================
async function loadAnalytics() {
  const topEl = document.getElementById('topProductsList');
  const distEl = document.getElementById('districtList');
  if (!topEl || !distEl) return;

  topEl.innerHTML = '<div class="loading">Turashakisha...</div>';
  distEl.innerHTML = '';

  try {
    const data = await API.adminAnalytics();
    const top = data.topProducts || [];
    const dist = data.byDistrict || [];

    topEl.innerHTML = top.length
      ? top.map((p, i) => `
        <div class="analytics-row">
          <span class="analytics-rank">${i + 1}</span>
          <span class="analytics-icon">${adEsc(p.icon)}</span>
          <div class="analytics-info">
            <strong>${adEsc(p.name)}</strong>
            <small>${p.qty} byagurishijwe</small>
          </div>
          <span class="analytics-value">${adFormatPrice(p.revenue)}</span>
        </div>`).join('')
      : '<p style="text-align:center;color:#888;">Nta makuru arahari</p>';

    distEl.innerHTML = dist.length
      ? dist.map(d => `
        <div class="analytics-row">
          <span class="analytics-icon">📍</span>
          <div class="analytics-info">
            <strong>${adEsc(d.district)}</strong>
            <small>${d.products} ibicuruzwa</small>
          </div>
          <span class="analytics-value">${adFormatPrice(d.revenue)}</span>
        </div>`).join('')
      : '<p style="text-align:center;color:#888;">Nta makuru arahari</p>';
  } catch (err) {
    topEl.innerHTML = `<p style="color:#e53935;">Error: ${adEsc(err.message)}</p>`;
  }
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Confirm we are admin
  try {
    const me = await API.me();
    adminUser = me.user;
    if (!adminUser || adminUser.role !== 'admin') {
      window.location.href = 'index.html';
      return;
    }
    const nameEl = document.getElementById('adminName');
    if (nameEl) nameEl.textContent = adminUser.name;
  } catch {
    window.location.href = 'index.html';
    return;
  }

  document.documentElement.style.visibility = 'visible';

  // Tab navigation
  document.querySelectorAll('.admin-tab').forEach(t =>
    t.addEventListener('click', () => showAdminTab(t.dataset.tab)));

  // Filters
  document.getElementById('userRoleFilter')?.addEventListener('change', loadUsers);
  document.getElementById('userSearch')?.addEventListener('input', () => {
    clearTimeout(window._uT);
    window._uT = setTimeout(loadUsers, 300);
  });
  document.getElementById('prodStatusFilter')?.addEventListener('change', loadAdminProducts);
  document.getElementById('prodCatFilter')?.addEventListener('change', loadAdminProducts);
  document.getElementById('orderStatusFilter')?.addEventListener('change', loadAdminOrders);

  // Delegated actions
  document.addEventListener('click', e => {
    const t1 = e.target.closest('[data-toggle-user]');
    if (t1) { adminToggleUser(t1.dataset.toggleUser, t1.dataset.status); return; }

    const t2 = e.target.closest('[data-delete-user]');
    if (t2) { adminDeleteUser(t2.dataset.deleteUser); return; }

    const t3 = e.target.closest('[data-prod-status]');
    if (t3) { adminProductStatus(t3.dataset.prodStatus, t3.dataset.status); return; }

    const t4 = e.target.closest('[data-delete-product]');
    if (t4) { adminDeleteProduct(t4.dataset.deleteProduct); return; }

    // Logout
    if (e.target.closest('#logoutLink')) {
      e.preventDefault();
      API.logout().finally(() => {
        location.href = 'index.html';
      });
    }
  });

  // Load first tab
  loadOverview();
});