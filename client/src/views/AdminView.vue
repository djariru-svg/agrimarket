<template>
  <div class="container">
    <div class="card form-card">
      <h1>Add Product</h1>

      <form @submit.prevent="submitForm">
        <div class="grid grid-2">
          <div class="form-group">
            <label>Name</label>
            <input v-model="form.name" required />
          </div>
          <div class="form-group">
            <label>Category</label>
            <select v-model="form.category" required>
              <option value="">Select category</option>
              <option value="Imboga">Imboga</option>
              <option value="Ibinyampeke">Ibinyampeke</option>
              <option value="Imyaka">Imyaka</option>
              <option value="Amata">Amata</option>
            </select>
          </div>
          <div class="form-group">
            <label>Price</label>
            <input v-model.number="form.price" type="number" min="1" required />
          </div>
          <div class="form-group">
            <label>Unit</label>
            <input v-model="form.unit" placeholder="kg, bunch, liter" required />
          </div>
          <div class="form-group">
            <label>Quantity</label>
            <input v-model.number="form.quantity" type="number" min="0" required />
          </div>
          <div class="form-group">
            <label>Location</label>
            <input v-model="form.location" required />
          </div>
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea v-model="form.description"></textarea>
        </div>

        <div class="form-group">
          <label>Emoji Icon</label>
          <input v-model="form.icon" placeholder="��" />
        </div>

        <button class="btn btn-primary btn-block" type="submit">Create Product</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();

const form = reactive({
  name: '',
  category: '',
  price: '',
  unit: '',
  quantity: '',
  location: '',
  description: '',
  icon: '🌾'
});

const submitForm = async () => {
  try {
    await axios.post('/api/products', form, { withCredentials: true });
    router.push('/dashboard');
  } catch (error) {
    alert(error.response?.data?.error || 'Failed to add product');
  }
};
</script>

<style scoped>
.form-card {
  padding: 2rem;
}
</style>
