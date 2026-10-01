import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
  {
    path: '/',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: 'Home' }
  },
  {
    path: '/products',
    component: () => import('@/views/ProductsView.vue'),
    meta: { title: 'Products' }
  },
  {
    path: '/about',
    component: () => import('@/views/AboutView.vue'),
    meta: { title: 'About' }
  },
  {
    path: '/login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { title: 'Login', requiresGuest: true }
  },
  {
    path: '/register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { title: 'Register', requiresGuest: true }
  },
  {
    path: '/dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { title: 'Dashboard', requiresAuth: true, role: 'farmer' }
  },
  {
    path: '/add-product',
    component: () => import('@/views/AddProductView.vue'),
    meta: { title: 'Add Product', requiresAuth: true, role: 'farmer' }
  },
  {
    path: '/admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { title: 'Admin', requiresAuth: true, role: 'admin' }
  },
  {
    path: '/orders',
    component: () => import('@/views/OrdersView.vue'),
    meta: { title: 'Orders', requiresAuth: true }
  },
  {
    path: '/farmer-orders',
    component: () => import('@/views/FarmerOrdersView.vue'),
    meta: { title: 'Orders', requiresAuth: true, role: 'farmer' }
  },
  {
    path: '/profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: 'Profile', requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Not Found' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Load user if not already loaded
  if (!authStore.initialized) {
    await authStore.loadUser();
  }

  // Redirect guests trying to access auth pages
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    return next('/');
  }

  // Check auth
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      return next('/login');
    }

    // Check role
    if (to.meta.role && authStore.user?.role !== to.meta.role && authStore.user?.role !== 'admin') {
      return next('/');
    }
  }

  next();
});

export default router;
