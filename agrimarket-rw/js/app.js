// ============================================================
// AgriMarket RW — Main Application Logic
// ============================================================

// ---------- PAGE GUARD (before anything else) ----------
const FARMER_ONLY_PAGES   = ['dashboard.html', 'add-product.html'];
const LOGGED_IN_PAGES = ['orders.html', 'profile.html', 'farmer-orders.html'];
const ADMIN_ONLY_PAGES    = ['admin.html'];
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

if ([...FARMER_ONLY_PAGES, ...LOGGED_IN_PAGES, ...ADMIN_ONLY_PAGES].includes(currentPage)) {
  document.documentElement.style.visibility = 'hidden';
}

let currentUser = null;
const productCache = new Map();

// ============================================================
// HELPERS
// ============================================================
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatPrice(price) {
  return Number(price || 0).toLocaleString('en-RW') + ' RWF';
}

function formatDate(d) {
  if (!d) return '';
  try {
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast ' + type + ' show';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================================
// DYNAMIC SEO — Update meta tags ku byiciro
// ============================================================
function updateMetaTags(title, description) {
  // Title
  document.title = title + ' — AgriMarket RW';
  
  // Description
  let descMeta = document.querySelector('meta[name="description"]');
  if (!descMeta) {
    descMeta = document.createElement('meta');
    descMeta.name = 'description';
    document.head.appendChild(descMeta);
  }
  descMeta.content = description;
  
  // Open Graph
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = title + ' — AgriMarket RW';
  
  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.content = description;
}

// Baza iyi function iyo uhinduye category
function filterByCategory(category) {
  const names = {
    'Imboga': 'Imboga',
    'Ibinyampeke': 'Ibinyampeke',
    'Imyumbati': 'Imyumbati',
    'Imyaka': 'Imyaka',
    'Amata': 'Amata',
    'Ibindi': 'Ibindi'
  };
  
  const name = names[category] || 'Ibicuruzwa';
  updateMetaTags(
    name,
    `Reba ${name.toLowerCase()} biva ku bahinzi b'u Rwanda ku AgriMarket RW.`
  );
}

// ============================================================
// CART (localStorage only — server validates on checkout)
// ============================================================
const Cart = {
  get() {
    try { return JSON.parse(localStorage.getItem('agrimarket_cart') || '[]'); }
    catch { return []; }
  },
  save(c) { localStorage.setItem('agrimarket_cart', JSON.stringify(c)); },
  clear() { localStorage.removeItem('agrimarket_cart'); }
};

function updateCartCount() {
  const count = Cart.get().reduce((s, i) => s + i.qty, 0);
  const el = document.getElementById('cartCount');
  if (el) el.textContent = count;
}

function addToCart(productId, product) {
  if (!currentUser) {
    showToast('Injira mbere yo kugura', 'error');
    openAuthModal('login');
    return;
  }
  if (currentUser.role !== 'buyer') {
    showToast('Abahinzi ntibashobora kugura', 'error');
    return;
  }
  const cart = Cart.get();
  const existing = cart.find(c => c.productId === productId);
  if (existing) existing.qty += 1;
  else cart.push({
    productId: product.id,
    name: product.name,
    price: product.price,
    unit: product.unit,
    icon: product.icon,
    farmerName: product.farmerName,
    qty: 1
  });
  Cart.save(cart);
  updateCartCount();
  showToast(product.name + ' byongewe mu gasanduku');
}

function removeFromCart(productId) {
  Cart.save(Cart.get().filter(c => c.productId !== productId));
  updateCartCount();
  renderCart();
  showToast('Byakuwe mu gasanduku');
}

function updateCartQty(productId, delta) {
  const cart = Cart.get();
  const item = cart.find(c => c.productId === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) return removeFromCart(productId);
  Cart.save(cart);
  updateCartCount();
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  if (!container) return;

  const cart = Cart.get();
  if (!cart.length) {
    container.innerHTML =
      '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>Agasanduku kawe nta kintu kirimo</p></div>';
    if (totalEl) totalEl.textContent = '0 RWF';
    return;
  }

  let total = 0;
  container.innerHTML = cart.map(item => {
    total += item.price * item.qty;
    return `<div class="cart-item">
      <div class="cart-item-img">${esc(item.icon)}</div>
      <div class="cart-item-info">
        <h4>${esc(item.name)}</h4>
        <p>${formatPrice(item.price)} / ${esc(item.unit)}</p>
        <p style="font-size:.75rem;color:#888;">${esc(item.farmerName)}</p>
        <div class="cart-item-qty">
          <button onclick="updateCartQty('${esc(item.productId)}',-1)">−</button>
          <span>${item.qty}</span>
          <button onclick="updateCartQty('${esc(item.productId)}',1)">+</button>
        </div>
      </div>
      <i class="fas fa-trash cart-item-remove" onclick="removeFromCart('${esc(item.productId)}')"></i>
    </div>`;
  }).join('');
  if (totalEl) totalEl.textContent = formatPrice(total);
}

function openCart() {
  const m = document.getElementById('cartModal');
  if (!m) return;
  renderCart();
  m.classList.add('show');
}
function closeCart() {
  document.getElementById('cartModal')?.classList.remove('show');
}

async function checkout() {
  if (!currentUser) {
    closeCart();
    openAuthModal('login');
    return showToast('Injira mbere yo gusaba order', 'error');
  }
  if (currentUser.role !== 'buyer') {
    return showToast('Abahinzi ntibashobora kugura', 'error');
  }
  const cart = Cart.get();
  if (!cart.length) return showToast('Agasanduku nta kintu kirimo', 'error');

  try {
    // ✅ Send ONLY productId + qty — server sets price
    const payload = cart.map(i => ({ productId: i.productId, qty: i.qty }));
    await API.createOrder(payload);
    Cart.clear();
    updateCartCount();
    closeCart();
    showToast('Order yawe yoherejwe! Umuhinzi azahamagara.');
    if (currentPage === 'orders.html') setTimeout(() => location.reload(), 800);
  } catch (err) {
    showToast(err.message || 'Order yananiwe', 'error');
  }
}

// ============================================================
// AUTH UI
// ============================================================
async function loadCurrentUser() {
  try {
    const data = await API.me();
    currentUser = data.user || null;
  } catch {
    currentUser = null;
  }
  updateAuthUI();

  // Page guards
  if (FARMER_ONLY_PAGES.includes(currentPage)) {
    if (!currentUser) {
      showToast('Ukeneye kwinjira mbere', 'error');
      return setTimeout(() => location.href = 'index.html', 1200);
    }
    if (currentUser.role !== 'farmer') {
      showToast('Uyu murongo ni uw\'Abahinzi gusa', 'error');
      return setTimeout(() => location.href = 'index.html', 1200);
    }
    document.documentElement.style.visibility = 'visible';
  }

  if (LOGGED_IN_PAGES.includes(currentPage)) {
    if (!currentUser) {
      showToast('Ukeneye kwinjira mbere', 'error');
      return setTimeout(() => location.href = 'index.html', 1200);
    }
    document.documentElement.style.visibility = 'visible';
  }

  if (ADMIN_ONLY_PAGES.includes(currentPage)) {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Uyu murongo ni uw\'Ubuyobozi gusa', 'error');
      return setTimeout(() => location.href = 'index.html', 1200);
    }
    document.documentElement.style.visibility = 'visible';
  }

  // Hide cart for farmers and admins
  if (currentUser && currentUser.role !== 'buyer') {
    const c = document.getElementById('cartBtn');
    if (c) c.style.display = 'none';
  }
}

function updateAuthUI() {
  const btn = document.getElementById('authBtn');
  if (!btn) return;
  document.getElementById('userMenu')?.remove();

  if (!currentUser) {
    btn.textContent = 'Injira';
    btn.href = '#';
    btn.onclick = e => { e.preventDefault(); openAuthModal('login'); };
    return;
  }

  btn.textContent = currentUser.name.split(' ')[0] + ' ▾';
  btn.href = '#';

  const menu = document.createElement('div');
  menu.id = 'userMenu';
  menu.className = 'user-menu';

  let items = '';
  if (currentUser.role === 'farmer') {
    items += '<a href="dashboard.html">📊 Dashboard</a>';
    items += '<a href="farmer-orders.html">📦 Orders</a>';
  } else if (currentUser.role === 'buyer') {
    items += '<a href="orders.html">📦 Orders zanjye</a>';
  } else if (currentUser.role === 'admin') {
    items += '<a href="admin.html">🛠 Admin Panel</a>';
  }
  items += '<a href="profile.html">👤 Profile</a>';
  items += '<a href="#" id="logoutLink">🚪 Sohoka</a>';
  menu.innerHTML = items;

  document.body.appendChild(menu);

  btn.onclick = e => {
    e.preventDefault();
    menu.classList.toggle('show');
  };

  document.getElementById('logoutLink').onclick = async e => {
    e.preventDefault();
    try { await API.logout(); } catch {}
    currentUser = null;
    updateAuthUI();
    showToast('Wasohotse neza');
    if (FARMER_ONLY_PAGES.concat(LOGGED_IN_PAGES, ADMIN_ONLY_PAGES).includes(currentPage)) {
      location.href = 'index.html';
    }
  };
}

function openAuthModal(tab = 'login') {
  const m = document.getElementById('authModal');
  if (!m) return;
  m.classList.add('show');
  switchAuthTab(tab);
}
function closeAuthModal() {
  document.getElementById('authModal')?.classList.remove('show');
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab));
  const l = document.getElementById('loginForm');
  const r = document.getElementById('registerForm');
  if (l) l.style.display = tab === 'login' ? 'block' : 'none';
  if (r) r.style.display = tab === 'register' ? 'block' : 'none';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const data = await API.login(email, password);
    currentUser = data.user;
    closeAuthModal();
    updateAuthUI();
    showToast('Murakaza neza, ' + currentUser.name + '!');

    if (currentUser.role === 'farmer')      setTimeout(() => location.href = 'dashboard.html', 700);
    else if (currentUser.role === 'admin')  setTimeout(() => location.href = 'admin.html', 700);
    else if (currentPage === 'orders.html') setTimeout(() => location.reload(), 700);
  } catch (err) {
    showToast(err.message || 'Login yananiwe', 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const userData = {
    name:     document.getElementById('regName').value.trim(),
    email:    document.getElementById('regEmail').value.trim(),
    phone:    document.getElementById('regPhone').value.trim(),
    district: document.getElementById('regDistrict').value,
    role:     document.getElementById('regRole').value,
    password: document.getElementById('regPassword').value
  };

  try {
    const data = await API.register(userData);
    currentUser = data.user;
    closeAuthModal();
    updateAuthUI();
    showToast('Konti yawe yaremwe neza!');
    if (currentUser.role === 'farmer')
      setTimeout(() => location.href = 'dashboard.html', 700);
  } catch (err) {
    showToast(err.message || 'Registration yananiwe', 'error');
  }
}

// ============================================================
// PRODUCTS RENDERING
// ============================================================
function renderProductCard(product) {
  productCache.set(product.id, product);
  const badge = product.badge ? `<span class="product-badge">${esc(product.badge)}</span>` : '';
  const soldOut = (product.status === 'sold_out' || product.quantity === 0);
  const btn = soldOut
    ? '<button class="btn btn-sm" disabled style="background:#ccc;color:#666;cursor:not-allowed;">Byashize</button>'
    : `<button class="btn btn-primary btn-sm add-to-cart-btn" data-id="${esc(product.id)}">
         <i class="fas fa-cart-plus"></i>
       </button>`;

  return `<div class="product-card" data-id="${esc(product.id)}">
    <div class="product-img">
      ${esc(product.icon || '🌾')}${badge}
      ${soldOut ? '<span class="product-badge" style="background:#e53935;">Byashize</span>' : ''}
    </div>
    <div class="product-info">
      <h3>${esc(product.name)}</h3>
      <div class="product-farmer"><i class="fas fa-user"></i> ${esc(product.farmerName)}</div>
      <div class="product-location"><i class="fas fa-map-marker-alt"></i> ${esc(product.location)}, ${esc(product.district)}</div>
      <div class="product-meta">
        <div>
          <span class="product-price">${formatPrice(product.price)}</span>
          <span class="product-unit">/ ${esc(product.unit)}</span>
        </div>
        ${btn}
      </div>
    </div>
  </div>`;
}

async function loadFeaturedProducts() {
  const c = document.getElementById('featuredProducts');
  if (!c) return;
  try {
    const data = await API.getProducts({ sort: 'newest' });
    const products = (data.products || []).slice(0, 4);
    c.innerHTML = products.length
      ? products.map(renderProductCard).join('')
      : '<p style="text-align:center;color:#888;grid-column:1/-1;">Nta bicuruzwa birahari.</p>';
  } catch (err) {
    c.innerHTML = `<p style="text-align:center;color:#888;grid-column:1/-1;">
      Nta bicuruzwa byabonetse. Reba niba server iri gukora.<br>
      <small>${esc(err.message)}</small></p>`;
  }
}

async function loadAllProducts(filters = {}) {
  const c = document.getElementById('allProducts');
  if (!c) return;
  c.innerHTML = '<div class="loading" style="grid-column:1/-1;"><i class="fas fa-spinner"></i><p>Turashakisha...</p></div>';
  try {
    const data = await API.getProducts(filters);
    const products = data.products || [];
    if (!products.length) {
      c.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#888;">
        <i class="fas fa-search" style="font-size:3rem;margin-bottom:12px;opacity:.4;"></i>
        <p>Nta bicuruzwa byabonetse</p></div>`;
      return;
    }
    c.innerHTML = products.map(renderProductCard).join('');
  } catch (err) {
    c.innerHTML = `<p style="text-align:center;color:#888;grid-column:1/-1;">Error: ${esc(err.message)}</p>`;
  }
}

// ============================================================
// DASHBOARD (farmer)
// ============================================================
async function loadDashboard() {
  if (!currentUser || currentUser.role !== 'farmer') return;

  const nameEl = document.getElementById('farmerName');
  if (nameEl) nameEl.textContent = currentUser.name;

  try {
    const stats = (await API.getStats()).stats || {};
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('statProducts', stats.products || 0);
    set('statOrders',   stats.orders   || 0);
    set('statRevenue',  formatPrice(stats.revenue || 0));
    set('statPending',  stats.pending  || 0);

    const products = (await API.getProducts({ farmerId: currentUser.id })).products || [];
    const tb = document.getElementById('productsTableBody');
    if (!tb) return;

    tb.innerHTML = products.length
      ? products.map(p => {
          const statusBadge = (p.status === 'sold_out')
            ? '<span class="badge badge-warning">Byashize</span>'
            : '<span class="badge badge-success">Active</span>';
          return `<tr>
            <td>${esc(p.icon)} ${esc(p.name)}</td>
            <td>${esc(p.category)}</td>
            <td>${formatPrice(p.price)} / ${esc(p.unit)}</td>
            <td>${p.quantity}</td>
            <td>${statusBadge}</td>
            <td>
              <button class="btn btn-sm btn-danger" data-delete="${esc(p.id)}">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="6" style="text-align:center;padding:30px;color:#888;">Nta bicuruzwa ufite. Ongeraho ibicuruzwa!</td></tr>';
  } catch (err) {
    showToast('Error loading dashboard: ' + err.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Uzi neza ko ushaka gusiba iki gicuruzwa?')) return;
  try {
    await API.deleteProduct(id);
    showToast('Igicuruzwa cyasibwe');
    loadDashboard();
  } catch (err) {
    showToast(err.message || 'Delete yananiwe', 'error');
  }
}

async function handleAddProduct(e) {
  e.preventDefault();
  const p = {
    name:        document.getElementById('prodName').value.trim(),
    category:    document.getElementById('prodCategory').value,
    price:       parseInt(document.getElementById('prodPrice').value),
    unit:        document.getElementById('prodUnit').value.trim(),
    quantity:    parseInt(document.getElementById('prodQty').value),
    location:    document.getElementById('prodLocation').value.trim(),
    description: document.getElementById('prodDesc').value.trim(),
    icon:        document.getElementById('prodIcon').value || '🌾'
  };

  try {
    await API.addProduct(p);
    showToast('Igicuruzwa cyongewe neza!');
    document.getElementById('addProductForm').reset();
    setTimeout(() => location.href = 'dashboard.html', 700);
  } catch (err) {
    showToast(err.message || 'Failed to add product', 'error');
  }
}

// ============================================================
// ORDERS PAGE (buyer)
// ============================================================
async function loadMyOrders() {
  const c = document.getElementById('ordersList');
  if (!c) return;

  c.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Turashakisha...</p></div>';

  try {
    const data = await API.getMyOrders();
    const orders = data.orders || [];

    if (!orders.length) {
      c.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#888;">
        <i class="fas fa-box-open" style="font-size:3rem;opacity:.3;margin-bottom:12px;display:block;"></i>
        <p>Nta orders ufite</p>
        <a href="products.html" class="btn btn-primary" style="margin-top:16px;">Reba Ibicuruzwa</a>
      </div>`;
      return;
    }

    c.innerHTML = orders.map(o => renderOrderCard(o, 'buyer')).join('');
  } catch (err) {
    c.innerHTML = `<p style="text-align:center;color:#e53935;">Error: ${esc(err.message)}</p>`;
  }
}

async function loadFarmerOrders() {
  const c = document.getElementById('ordersList');
  if (!c) return;

  c.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Turashakisha...</p></div>';

  try {
    const data = await API.getOrders();
    const orders = (data.orders || []).filter(o =>
      o.items.some(i => i.farmerId === currentUser.id)
    );

    if (!orders.length) {
      c.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#888;">
        <i class="fas fa-inbox" style="font-size:3rem;opacity:.3;margin-bottom:12px;display:block;"></i>
        <p>Nta orders zirahari</p>
      </div>`;
      return;
    }

    c.innerHTML = orders.map(o => renderOrderCard(o, 'farmer')).join('');
  } catch (err) {
    c.innerHTML = `<p style="text-align:center;color:#e53935;">Error: ${esc(err.message)}</p>`;
  }
}

function renderOrderCard(o, viewAs) {
  const statusMap = {
    pending:   { label: 'Itegereje',   cls: 'badge-warning' },
    confirmed: { label: 'Yemejwe',     cls: 'badge-info' },
    delivered: { label: 'Yatanzwe',    cls: 'badge-success' },
    cancelled: { label: 'Yahagaritswe',cls: 'badge-danger' }
  };
  const s = statusMap[o.status] || { label: o.status, cls: '' };

  const itemsHtml = o.items.map(i => `
    <div class="order-item">
      <span class="order-item-icon">${esc(i.icon || '🌾')}</span>
      <div class="order-item-info">
        <strong>${esc(i.name)}</strong>
        <small>${i.qty} × ${formatPrice(i.price)} ${esc(i.unit || '')}</small>
        <small style="color:#888;">Umuhinzi: ${esc(i.farmerName)}</small>
      </div>
      <span class="order-item-subtotal">${formatPrice(i.subtotal || i.price * i.qty)}</span>
    </div>`).join('');

  let actions = '';
  if (viewAs === 'buyer' && o.status === 'pending') {
    actions = `<button class="btn btn-sm btn-danger" data-cancel-order="${esc(o.id)}">
      <i class="fas fa-times"></i> Hagarika
    </button>`;
  } else if (viewAs === 'farmer' && o.status === 'pending') {
    actions = `<button class="btn btn-sm btn-primary" data-order-status="${esc(o.id)}" data-status="confirmed">
      <i class="fas fa-check"></i> Emeza
    </button>`;
  } else if (viewAs === 'farmer' && o.status === 'confirmed') {
    actions = `<button class="btn btn-sm btn-primary" data-order-status="${esc(o.id)}" data-status="delivered">
      <i class="fas fa-truck"></i> Natange
    </button>`;
  }

  return `<div class="order-card">
    <div class="order-header">
      <div>
        <strong>Order #${esc(o.id.slice(-8))}</strong>
        <span class="badge ${s.cls}" style="margin-left:10px;">${s.label}</span>
      </div>
      <small>${formatDate(o.createdAt)}</small>
    </div>
   <div class="order-meta">
  <span><i class="fas fa-user"></i> ${esc(o.userName)}</span>
  ${o.userDistrict ? `<span><i class="fas fa-map-marker-alt"></i> ${esc(o.userDistrict)}</span>` : ''}
  ${viewAs === 'farmer' && o.phoneHidden
    ? '<span style="color:#f57c00;"><i class="fas fa-lock"></i> Telefoni irahishwe — emeza order kugira ngo uyibone</span>'
    : (o.userPhone ? `<span><i class="fas fa-phone"></i> ${esc(o.userPhone)}</span>` : '')}
</div>
    <div class="order-items">${itemsHtml}</div>
    <div class="order-footer">
      <strong>Igiteranyo: <span style="color:var(--primary-dark);">${formatPrice(o.total)}</span></strong>
      ${actions}
    </div>
  </div>`;
}

async function cancelOrder(id) {
  if (!confirm('Ushaka guhagarika iyi order?')) return;
  try {
    await API.cancelMyOrder(id);
    showToast('Order yahagaritswe');
    loadMyOrders();
  } catch (err) { showToast(err.message, 'error'); }
}

async function updateOrderStatus(id, status) {
  try {
    await API.updateOrderStatus(id, status);
    showToast('Status yahinduwe');
    loadFarmerOrders();
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
// PROFILE PAGE
// ============================================================
async function loadProfile() {
  try {
    const data = await API.getProfile();
    const u = data.user || currentUser;
    if (!u) return;

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    set('profName', u.name);
    set('profEmail', u.email);
    set('profPhone', u.phone);
    set('profDistrict', u.district);

    const emailEl = document.getElementById('profEmail');
    if (emailEl) emailEl.disabled = true; // email can't change
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  const data = {
    name:     document.getElementById('profName').value.trim(),
    phone:    document.getElementById('profPhone').value.trim(),
    district: document.getElementById('profDistrict').value
  };
  try {
    const res = await API.updateProfile(data);
    currentUser = res.user;
    updateAuthUI();
    showToast('Amakuru yahinduwe');
  } catch (err) { showToast(err.message, 'error'); }
}

async function handlePasswordChange(e) {
  e.preventDefault();
  const current = document.getElementById('pwCurrent').value;
  const newPass = document.getElementById('pwNew').value;
  const confirm = document.getElementById('pwConfirm').value;

  if (newPass !== confirm) return showToast('Amagambo y\'ibanga ntabwo ahura', 'error');

  try {
    await API.changePassword(current, newPass);
    showToast('Ijambo ry\'ibanga ryahinduwe');
    e.target.reset();
  } catch (err) { showToast(err.message, 'error'); }
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentUser();
  updateCartCount();

  // ---------- Shared UI wiring ----------
  document.getElementById('closeAuth')?.addEventListener('click', closeAuthModal);
  document.getElementById('closeCart')?.addEventListener('click', closeCart);

  document.querySelectorAll('.auth-tab').forEach(t =>
    t.addEventListener('click', () => switchAuthTab(t.dataset.tab)));

  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
  document.getElementById('cartBtn')?.addEventListener('click', e => { e.preventDefault(); openCart(); });
  document.getElementById('checkoutBtn')?.addEventListener('click', checkout);
  document.getElementById('addProductForm')?.addEventListener('submit', handleAddProduct);
  document.getElementById('profileForm')?.addEventListener('submit', handleProfileUpdate);
  document.getElementById('passwordForm')?.addEventListener('submit', handlePasswordChange);

  // ---------- Global click delegation ----------
  document.addEventListener('click', e => {
    const addBtn = e.target.closest('.add-to-cart-btn');
    if (addBtn) {
      const p = productCache.get(addBtn.dataset.id);
      if (p) addToCart(addBtn.dataset.id, p);
      return;
    }
    const delBtn = e.target.closest('[data-delete]');
    if (delBtn) { deleteProduct(delBtn.dataset.delete); return; }

    const cancelBtn = e.target.closest('[data-cancel-order]');
    if (cancelBtn) { cancelOrder(cancelBtn.dataset.cancelOrder); return; }

    const statusBtn = e.target.closest('[data-order-status]');
    if (statusBtn) {
      updateOrderStatus(statusBtn.dataset.orderStatus, statusBtn.dataset.status);
      return;
    }
  });

   // ---------- Become Seller buttons ----------
  ['becomeSellerBtn', 'footerSeller'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      e.preventDefault();
      if (currentUser) {
        showToast('Usanzwe ufite konti', 'info');
        return;
      }
      openAuthModal('register');
      setTimeout(() => {
        const r = document.getElementById('regRole');
        if (r) r.value = 'farmer';
      }, 50);
    });
  });

  // ---------- Category cards ----------
  document.querySelectorAll('.category-card').forEach(c => {
    c.addEventListener('click', () => {
      location.href = 'products.html?category=' + encodeURIComponent(c.dataset.category);
    });
  });

  // ---------- Mobile menu ----------
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('navLinks')?.classList.toggle('show');
  });

  // ---------- Global close handlers ----------
  window.addEventListener('click', e => {
    if (e.target.classList?.contains('modal')) e.target.classList.remove('show');
    if (!e.target.closest('#userMenu') && !e.target.closest('#authBtn')) {
      document.getElementById('userMenu')?.classList.remove('show');
    }
  });

  // ---------- Page-specific: HOME ----------
  loadFeaturedProducts();

  // ---------- Page-specific: PRODUCTS ----------
  if (document.getElementById('allProducts')) {
    const params = new URLSearchParams(location.search);
    const initialCategory = params.get('category') || 'all';
    const catSel = document.getElementById('filterCategory');
    if (catSel && initialCategory !== 'all') catSel.value = initialCategory;

    const applyFilters = () => loadAllProducts({
      search:   document.getElementById('searchInput')?.value   || '',
      category: document.getElementById('filterCategory')?.value || 'all',
      district: document.getElementById('filterDistrict')?.value || 'all',
      sort:     document.getElementById('filterSort')?.value     || 'newest'
    });

    loadAllProducts({ category: initialCategory });

    ['searchInput', 'filterCategory', 'filterDistrict', 'filterSort'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(id === 'searchInput' ? 'input' : 'change', applyFilters);
    });
  }

  // ---------- Page-specific: DASHBOARD ----------
  if (document.getElementById('productsTableBody')) {
    loadDashboard();
  }

  // ---------- Page-specific: ORDERS (buyer) ----------
  if (document.getElementById('ordersList') && currentPage === 'orders.html') {
    loadMyOrders();
  }

  // ---------- Page-specific: FARMER ORDERS ----------
  if (document.getElementById('ordersList') && currentPage === 'farmer-orders.html') {
    loadFarmerOrders();
  }

  // ---------- Page-specific: PROFILE ----------
  if (document.getElementById('profileForm')) {
    loadProfile();
  }
});

// Expose functions used in inline onclick attributes
window.updateCartQty    = updateCartQty;
window.removeFromCart   = removeFromCart;