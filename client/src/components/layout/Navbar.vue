<template>
  <header class="navbar">
    <div class="container nav-inner">
      <router-link to="/" class="brand">
        <span class="brand-icon">🌾</span>
        <span>AgriMarket RW</span>
      </router-link>

      <nav class="nav-links">
        <router-link to="/">Home</router-link>
        <router-link to="/products">Products</router-link>
        <router-link to="/about">About</router-link>
        <router-link v-if="authStore.user?.role === 'farmer'" to="/dashboard">Dashboard</router-link>
        <router-link v-if="authStore.user?.role === 'admin'" to="/admin">Admin</router-link>
      </nav>

      <div class="nav-actions">
        <button class="btn btn-secondary btn-small" @click="toggleTheme">
          {{ themeStore.mode === 'dark' ? '☀️' : '🌙' }}
        </button>

        <button class="btn btn-primary btn-small" @click="openCart">
          🛒 {{ cartStore.count }}
        </button>

        <template v-if="authStore.isAuthenticated">
          <router-link to="/profile" class="user-pill">
            {{ authStore.user?.name || 'Profile' }}
          </router-link>
          <button class="btn btn-small btn-secondary" @click="handleLogout">Logout</button>
        </template>

        <template v-else>
          <router-link to="/login" class="btn btn-small btn-secondary">Login</router-link>
          <router-link to="/register" class="btn btn-small btn-primary">Register</router-link>
        </template>
      </div>
    </div>

    <div v-if="cartOpen" class="cart-panel">
      <div class="cart-header">
        <h3>Cart</h3>
        <button class="btn btn-small" @click="cartOpen = false">Close</button>
      </div>

      <div v-if="cartStore.items.length === 0" class="cart-empty">
        Your cart is empty.
      </div>

      <div v-else>
        <div v-for="item in cartStore.items" :key="item.id" class="cart-item">
          <div>
            <strong>{{ item.name }}</strong>
            <div>{{ item.price }} RWF x {{ item.qty }}</div>
          </div>
          <button class="btn btn-small btn-danger" @click="cartStore.removeItem(item.id)">Remove</button>
        </div>
        <div class="cart-total">
          Total: {{ cartStore.total }} RWF
        </div>
        <button class="btn btn-primary btn-block" @click="checkout">Checkout</button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';
import { useThemeStore } from '@/stores/theme';

const authStore = useAuthStore();
const cartStore = useCartStore();
const themeStore = useThemeStore();
const router = useRouter();
const cartOpen = ref(false);

const toggleTheme = () => {
  themeStore.setMode(themeStore.mode === 'dark' ? 'light' : 'dark');
};

const openCart = () => {
  cartOpen.value = !cartOpen.value;
};

const handleLogout = async () => {
  await authStore.logout();
  router.push('/');
};

const checkout = async () => {
  try {
    await cartStore.checkout();
    cartOpen.value = false;
    alert('Order placed successfully');
  } catch (error) {
    alert(error.message || 'Checkout failed');
  }
};
</script>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
}

[data-theme='dark'] .navbar {
  background: rgba(29, 29, 29, 0.9);
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  gap: 1rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
  font-size: 1.1rem;
}

.brand-icon {
  font-size: 1.8rem;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.nav-links a {
  color: var(--text);
  font-weight: 600;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.user-pill {
  background: var(--primary);
  color: white !important;
  padding: 0.5rem 0.9rem;
  border-radius: 999px;
  font-size: 0.9rem;
}

.cart-panel {
  position: absolute;
  right: 1rem;
  top: 82px;
  width: min(380px, calc(100vw - 2rem));
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 1rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  padding: 1rem;
}

.cart-header,
.cart-item,
.cart-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.cart-item {
  padding: 0.8rem 0;
  border-bottom: 1px solid var(--border);
}

.cart-empty {
  padding: 1rem 0;
  color: var(--text-light);
}

@media (max-width: 768px) {
  .nav-inner {
    flex-direction: column;
    align-items: flex-start;
    padding: 0.8rem 0;
  }

  .nav-links,
  .nav-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
