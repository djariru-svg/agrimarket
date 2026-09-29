// ============================================================
// AgriMarket RW — API Client
// Handles all backend communication with PHP
// ============================================================

const API = {
  base: 'api/',

  async request(endpoint, options = {}) {
    const url = this.base + endpoint;
    const config = {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin', // important for PHP sessions
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    let res;
    try {
      res = await fetch(url, config);
    } catch (networkErr) {
      console.error('Network error:', networkErr);
      throw new Error('Ntabwo duhuye na server. Reba niba Apache iri gukora.');
    }

    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      console.error('Invalid JSON from server:', parseErr);
      throw new Error('Server yatanze igisubizo kitarukwiye. Reba PHP error log.');
    }

    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  },

  // ============ AUTH ============
  login(email, password) {
    return this.request('auth.php?action=login', {
      method: 'POST',
      body: { email, password }
    });
  },

  register(userData) {
    return this.request('auth.php?action=register', {
      method: 'POST',
      body: userData
    });
  },

  logout() {
    return this.request('auth.php?action=logout');
  },

  me() {
    return this.request('auth.php?action=me');
  },

  // ============ PRODUCTS ============
  getProducts(filters = {}) {
    const params = new URLSearchParams();
    params.set('action', 'list');
    if (filters.search)   params.set('search', filters.search);
    if (filters.category) params.set('category', filters.category);
    if (filters.district) params.set('district', filters.district);
    if (filters.sort)     params.set('sort', filters.sort);
    if (filters.farmerId) params.set('farmerId', filters.farmerId);
    return this.request('products.php?' + params.toString());
  },

  getProduct(id) {
    return this.request('products.php?action=get&id=' + encodeURIComponent(id));
  },

  addProduct(product) {
    return this.request('products.php?action=add', {
      method: 'POST',
      body: product
    });
  },

  updateProduct(product) {
    return this.request('products.php?action=update', {
      method: 'POST',
      body: product
    });
  },

  deleteProduct(id) {
    return this.request('products.php?action=delete', {
      method: 'POST',
      body: { id }
    });
  },

  // ============ ORDERS ============
  createOrder(items, note = '') {
    // items must be [{ productId, qty }] — server sets price
    return this.request('orders.php?action=create', {
      method: 'POST',
      body: { items, note }
    });
  },

  getOrders() {
    return this.request('orders.php?action=list');
  },

  updateOrderStatus(id, status) {
    return this.request('orders.php?action=status', {
      method: 'POST',
      body: { id, status }
    });
  },

  getStats() {
    return this.request('orders.php?action=stats');
  },

  // ============ PROFILE ============
  getProfile() {
    return this.request('profile.php?action=get');
  },

  updateProfile(data) {
    return this.request('profile.php?action=update', {
      method: 'POST',
      body: data
    });
  },

  changePassword(current, newPass) {
    return this.request('profile.php?action=password', {
      method: 'POST',
      body: { current, new: newPass }
    });
  },

  getMyOrders() {
    return this.request('profile.php?action=my-orders');
  },

  cancelMyOrder(id) {
    return this.request('profile.php?action=cancel-order', {
      method: 'POST',
      body: { id }
    });
  },

  // ============ ADMIN ============
  adminOverview() {
    return this.request('admin.php?action=overview');
  },

  adminGetUsers(filters = {}) {
    const params = new URLSearchParams();
    params.set('action', 'users');
    if (filters.role)   params.set('role', filters.role);
    if (filters.search) params.set('search', filters.search);
    return this.request('admin.php?' + params.toString());
  },

  adminUserStatus(id, status) {
    return this.request('admin.php?action=user-status', {
      method: 'POST',
      body: { id, status }
    });
  },

  adminDeleteUser(id) {
    return this.request('admin.php?action=user-delete', {
      method: 'POST',
      body: { id }
    });
  },

  adminGetProducts(filters = {}) {
    const params = new URLSearchParams();
    params.set('action', 'products');
    if (filters.status)   params.set('status', filters.status);
    if (filters.category) params.set('category', filters.category);
    return this.request('admin.php?' + params.toString());
  },

  adminProductStatus(id, status) {
    return this.request('admin.php?action=product-status', {
      method: 'POST',
      body: { id, status }
    });
  },

  adminGetOrders(status = '') {
    const params = new URLSearchParams();
    params.set('action', 'orders');
    if (status) params.set('status', status);
    return this.request('admin.php?' + params.toString());
  },

  adminAnalytics() {
    return this.request('admin.php?action=analytics');
  }
};