<template>
  <div id="app" :data-theme="themeStore.mode" :data-color="themeStore.color">
    <div class="app-container">
      <Navbar v-if="!isAuthPage" />
      <main class="main-content">
        <router-view />
      </main>
      <ChatWidget />
      <Footer v-if="!isAuthPage" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import Navbar from '@/components/layout/Navbar.vue';
import Footer from '@/components/layout/Footer.vue';
import ChatWidget from '@/components/ai/ChatWidget.vue';

const authStore = useAuthStore();
const themeStore = useThemeStore();
const route = useRoute();

const isAuthPage = computed(() => route.path === '/login' || route.path === '/register');

onMounted(async () => {
  await authStore.loadUser();
  themeStore.applyTheme();
});
</script>

<style scoped>
#app {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding: 2rem 1rem;
}

@media (max-width: 768px) {
  .main-content {
    padding: 1rem 0.5rem;
  }
}
</style>
