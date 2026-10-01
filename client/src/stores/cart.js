import { defineStore } from 'pinia';
import axios from 'axios';

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: JSON.parse(localStorage.getItem('cart') || '[]')
  }),

  actions: {
    addItem(product) {
      const found = this.items.find(i => i.id === product.id);
      if (found) {
        found.qty += 1;
      } else {
        this.items.push({ ...product, qty: 1 });
      }
      this.saveCart();
    },

    removeItem(id) {
      this.items = this.items.filter(i => i.id !== id);
      this.saveCart();
    },

    updateQty(id, qty) {
      const item = this.items.find(i => i.id === id);
      if (item) {
        item.qty = Math.max(1, qty);
        this.saveCart();
      }
    },

    clear() {
      this.items = [];
      this.saveCart();
    },

    saveCart() {
      localStorage.setItem('cart', JSON.stringify(this.items));
    },

    async checkout() {
      try {
        const response = await axios.post('/api/orders', {
          items: this.items.map(i => ({ productId: i.id, qty: i.qty }))
        }, { withCredentials: true });
        this.clear();
        return response.data;
      } catch (error) {
        throw error.response?.data || error;
      }
    }
  },

  getters: {
    count: (state) => state.items.reduce((sum, item) => sum + item.qty, 0),
    total: (state) => state.items.reduce((sum, item) => sum + (item.price * item.qty), 0),
    isEmpty: (state) => state.items.length === 0
  }
});
