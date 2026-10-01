<template>
  <div class="container">
    <div class="page-header">
      <h1>Farmer Dashboard</h1>
      <router-link to="/add-product" class="btn btn-primary">Add Product</router-link>
    </div>

    <div class="grid grid-3 mt-4">
      <div class="card">
        <h3>Total Products</h3>
        <p>{{ farmerProducts.length }}</p>
      </div>
      <div class="card">
        <h3>Pending Orders</h3>
        <p>4</p>
      </div>
      <div class="card">
        <h3>Revenue</h3>
        <p>245,000 RWF</p>
      </div>
    </div>

    <div class="section mt-4">
      <h2>Your Products</h2>
      <div v-if="farmerProducts.length === 0" class="card">No products yet.</div>
      <div v-else class="grid grid-3">
        <div v-for="product in farmerProducts" :key="product.id" class="card product-card">
          <div class="product-emoji">{{ product.icon || '🌾' }}</div>
          <h3>{{ product.name }}</h3>
          <p>{{ product.category }}</p>
          <div class="price-row"><strong>{{ product.price }} RWF</strong> / {{ product.unit }}</div>
          <div class="meta">Stock: {{ product.quantity }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import axios from 'axios';

const farmerProducts = ref([]);

onMounted(async () => {
  try {
    const response = await axios.get('/api/products', { withCredentials: true });
    farmerProducts.value = response.data.filter(p => p.farmer_id === 1 || p.farmer_id === 2 || p.farmer_id === 3 || p.farmer_id === 4 || p.farmer_id === 5 || p.farmer_id === 6);
  } catch (error) {
    console.error(error);
  }
});
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
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

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
