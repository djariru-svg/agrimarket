<template>
  <div class="auth-shell">
    <div class="card auth-card">
      <h1>Login</h1>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" required />
        </div>
        <button class="btn btn-primary btn-block" type="submit">Login</button>
      </form>
      <div class="auth-link">
        <router-link to="/register">Need an account? Register</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();
const email = ref('');
const password = ref('');

const handleLogin = async () => {
  try {
    await authStore.login(email.value, password.value);
    router.push('/');
  } catch (error) {
    alert(error.message || 'Login failed');
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
  width: min(420px, 90vw);
  padding: 2rem;
}

.auth-link {
  margin-top: 1rem;
  text-align: center;
}
</style>
