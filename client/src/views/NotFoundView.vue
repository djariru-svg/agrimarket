<template>
  <div class="container">
    <div class="card profile-card">
      <h1>Profile</h1>
      <div class="profile-item">
        <strong>Name:</strong> {{ authStore.user?.name || 'Unknown' }}
      </div>
      <div class="profile-item">
        <strong>Email:</strong> {{ authStore.user?.email || 'Unknown' }}
      </div>
      <div class="profile-item">
        <strong>Role:</strong> {{ authStore.user?.role || 'Unknown' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth';
const authStore = useAuthStore();
</script>

<style scoped>
.profile-card {
  padding: 2rem;
}

.profile-item {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border);
}
</style>
