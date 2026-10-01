import { defineStore } from 'pinia';
import axios from 'axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    initialized: false
  }),

  actions: {
    async loadUser() {
      if (this.initialized) return;
      try {
        const response = await axios.get('/api/auth/me', { withCredentials: true });
        this.user = response.data;
        this.isAuthenticated = true;
      } catch (error) {
        this.user = null;
        this.isAuthenticated = false;
      } finally {
        this.initialized = true;
      }
    },

    async login(email, password) {
      this.loading = true;
      try {
        const response = await axios.post('/api/auth/login', { email, password }, { withCredentials: true });
        this.user = response.data.user;
        this.isAuthenticated = true;
        return response.data;
      } catch (error) {
        throw error.response?.data || error;
      } finally {
        this.loading = false;
      }
    },

    async register(data) {
      this.loading = true;
      try {
        const response = await axios.post('/api/auth/register', data, { withCredentials: true });
        this.user = response.data.user;
        this.isAuthenticated = true;
        return response.data;
      } catch (error) {
        throw error.response?.data || error;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      try {
        await axios.post('/api/auth/logout', {}, { withCredentials: true });
      } finally {
        this.user = null;
        this.isAuthenticated = false;
      }
    },

    isFarmer() {
      return this.user?.role === 'farmer';
    },

    isBuyer() {
      return this.user?.role === 'buyer';
    },

    isAdmin() {
      return this.user?.role === 'admin';
    }
  }
});
