<template>
  <div>
    <HeroSection />

    <section class="container section">
      <div class="section-header">
        <h2>Featured Products</h2>
        <router-link to="/products" class="link">View All</router-link>
      </div>

      <div v-if="productsStore.loading" class="loading-box">
        <div class="spinner"></div>
      </div>

      <div v-else class="grid grid-4">
        <div v-for="product in featuredProducts" :key="product.id" class="card product-card">
          <div class="product-emoji">{{ product.icon || '🌾' }}</div>
          <div class="product-badge-inline">{{ product.badge || 'Fresh' }}</div>
          <h3>{{ product.name }}</h3>
          <p>{{ product.category }}</p>
          <div class="price-row">
            <strong>{{ product.price }} RWF</strong>
            <span>/ {{ product.unit }}</span>
          </div>
          <div class="meta">Stock: {{ product.quantity }}</div>
          <button class="btn btn-primary btn-block mt-2" @click="addToCart(product)">Add to Cart</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useProductsStore } from '@/stores/products';
import { useCartStore } from '@/stores/cart';
import HeroSection from '@/components/layout/HeroSection.vue';

const productsStore = useProductsStore();
const cartStore = useCartStore();

const featuredProducts = computed(() => productsStore.list.slice(0, 4));

onMounted(async () => {
  await productsStore.fetchProducts();
});

const addToCart = (product) => {
  cartStore.addItem(product);
};
</script>

<style scoped>
.section {
  padding: 2rem 0 3rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.link {
  font-weight: 700;
}

.loading-box {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
}

.product-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.product-emoji {
  font-size: 3rem;
  text-align: center;
  background: rgba(47, 143, 70, 0.08);
  border-radius: 1rem;
  padding: 1rem;
}

.product-badge-inline {
  background: rgba(47, 143, 70, 0.12);
  color: var(--primary);
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  display: inline-flex;
  align-self: flex-start;
  font-size: 0.75rem;
  font-weight: 700;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  font-size: 1.1rem;
}

.meta {
  color: var(--text-light);
  font-size: 0.9rem;
}
</style>
