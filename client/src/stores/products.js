import { defineStore } from 'pinia';
import axios from 'axios';

export const useProductsStore = defineStore('products', {
  state: () => ({
    list: [],
    loading: false,
    currentProduct: null
  }),

  actions: {
    async fetchProducts(filters = {}) {
      this.loading = true;
      try {
        const response = await axios.get('/api/products', { params: filters });
        this.list = response.data;
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        this.loading = false;
      }
    },

    async fetchProduct(id) {
      try {
        const response = await axios.get(`/api/products/${id}`);
        this.currentProduct = response.data;
        return response.data;
      } catch (error) {
        console.error('Error fetching product:', error);
      }
    },

    async createProduct(data) {
      try {
        const response = await axios.post('/api/products', data, { withCredentials: true });
        this.list.push(response.data);
        return response.data;
      } catch (error) {
        throw error.response?.data || error;
      }
    },

    async updateProduct(id, data) {
      try {
        const response = await axios.put(`/api/products/${id}`, data, { withCredentials: true });
        return response.data;
      } catch (error) {
        throw error.response?.data || error;
      }
    },

    async deleteProduct(id) {
      try {
        await axios.delete(`/api/products/${id}`, { withCredentials: true });
        this.list = this.list.filter(p => p.id !== id);
      } catch (error) {
        throw error.response?.data || error;
      }
    }
  },

  getters: {
    categories: (state) => {
      const categories = new Set();
      state.list.forEach(p => categories.add(p.category));
      return Array.from(categories);
    }
  }
});
