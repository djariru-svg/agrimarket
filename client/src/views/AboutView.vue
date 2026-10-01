<template>
  <div class="container">
    <div class="page-header">
      <h1>All Products</h1>
      <p>Fresh produce and agricultural goods from trusted farmers.</p>
    </div>

    <div class="filters card">
      <input v-model="search" type="text" placeholder="Search products..." />
      <select v-model="category">
        <option value="">All Categories</option>
        <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
      </select>
      <button class="btn btn-primary" @click="applyFilters">Search</button>
    </div>

    <div v-if="productsStore.loading" class="loading-box">
      <div class="spinner"></div>
    </div>

    <div v-else class="grid grid-3 mt-4">
      <div v-for="product in productsStore.list" :key="product.id" class="card product-card">
        <div class="product-emoji">{{ product.icon || '🌾' }}</div>
        <h3>{{ product.name }}</h3>
        <p>{{ product.category }}</p>
        <div class="price-row"><strong>{{ product.price }} RWF</strong> / {{ product.unit }}</div>
        <div class="meta">Location: {{ product.location }}</div>
        <div class="meta">Available: {{ product.quantity }}</div>
        <button class="btn btn-primary btn-block mt-2" @click="addToCart(product)">Add to Cart</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useProductsStore } from '@/stores/products';
import { useCartStore } from '@/stores/cart';

const productsStore = useProductsStore();
const cartStore = useCartStore();
const search = ref('');
const category = ref('');

const categories = computed(() => productsStore.categories);

onMounted(async () => {
  await productsStore.fetchProducts();
});

const applyFilters = async () => {
  await productsStore.fetchProducts({ search: search.value, category: category.value });
};

const addToCart = (product) => {
  cartStore.addItem(product);
};
</script>

<style scoped>
.page-header {
  padding: 1rem 0 2rem;
}

.filters {
  display: grid;
  grid-template-columns: 2fr 1fr auto;
  gap: 1rem;
}

.product-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.product-emoji {
  font-size: 3rem;
  background: rgba(47, 143, 70, 0.08);
  border-radius: 1rem;
  text-align: center;
  padding: 1rem;
}

.loading-box {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
}

@media (max-width: 768px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
