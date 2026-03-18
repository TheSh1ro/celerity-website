import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guestOnly: true, title: 'Login' },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true, title: 'Admin' },
    },
    {
      path: '/',
      name: 'user',
      component: () => import('../views/UserView.vue'),
      meta: { requiresAuth: true, title: 'Dashboard' },
    },
  ],
})

const APP_NAME = 'BEDROCK'

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  document.title = to.meta.title ? `${to.meta.title} | ${APP_NAME}` : APP_NAME

  if (auth.token && !auth.user) {
    await auth.loadProfile()
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'user' }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'user' }
  }
})

export default router
