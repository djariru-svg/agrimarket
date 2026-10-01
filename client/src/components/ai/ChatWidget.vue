<template>
  <div class="auth-shell">
    <div class="card auth-card">
      <h1>Register</h1>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label>Name</label>
          <input v-model="form.name" required />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="form.email" type="email" required />
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input v-model="form.phone" required />
        </div>
        <div class="form-group">
          <label>District</label>
          <input v-model="form.district" required />
        </div>
        <div class="form-group">
          <label>Role</label>
          <select v-model="form.role" required>
            <option value="buyer">Buyer</option>
            <option value="farmer">Farmer</option>
          </select>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="form.password" type="password" required />
        </div>
        <div class="form-group">
          <label>Confirm Password</label>
          <input v-model="form.confirmPassword" type="password" required />
        </div>
        <button class="btn btn-primary btn-block" type="submit">Register</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const form = reactive({
  name: '',
  email: '',
  phone: '',
  district: '',
  role: 'buyer',
  password: '',
  confirmPassword: ''
});

const handleRegister = async () => {
  try {
    await authStore.register(form);
    router.push('/');
  } catch (error) {
    alert(error.message || 'Registration failed');
  }
};
</script>

<style scoped>
.auth-shell {
  min-height: 80vh;
  display: grid;
  place-items: center;
}

.auth-card {
  width: min(520px, 90vw);
  padding: 2rem;
}
</style>
