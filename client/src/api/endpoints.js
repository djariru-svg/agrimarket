import api from './client.js';

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me')
};

export const productsAPI = {
  getAll: (filters) => api.get('/products', { params: filters }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`)
};

export const ordersAPI = {
  create: (data) => api.post('/orders', data),
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, status) => api.post(`/orders/${id}/status`, { status })
};

export const profileAPI = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/profile', data),
  changePassword: (data) => api.post('/profile/password', data),
  getOrders: () => api.get('/profile/orders'),
  cancelOrder: (id) => api.post(`/profile/orders/${id}/cancel`)
};

export const uploadAPI = {
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/upload/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteAvatar: () => api.delete('/upload/avatar'),
  uploadProductImage: (productId, file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/upload/product/${productId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
};

export const adminAPI = {
  getOverview: () => api.get('/admin/overview'),
  getUsers: () => api.get('/admin/users'),
  updateUserStatus: (id, status) => api.post(`/admin/users/${id}/status`, { status }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getProducts: () => api.get('/admin/products'),
  updateProductStatus: (id, status) => api.post(`/admin/products/${id}/status`, { status }),
  getOrders: () => api.get('/admin/orders'),
  getAnalytics: () => api.get('/admin/analytics')
};

export const aiAPI = {
  chat: (message, sessionId) => api.post('/ai/chat', { message, sessionId }),
  getHistory: (sessionId) => api.get(`/ai/history/${sessionId}`),
  deleteHistory: (sessionId) => api.delete(`/ai/history/${sessionId}`)
};
