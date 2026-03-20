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
      component: () => import('../views/UserView.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: { name: 'license' } },
        {
          path: 'license',
          name: 'license',
          component: () => import('@/components/TabLicense.vue'),
          meta: { title: 'Minha Licença' },
        },
        {
          path: 'resale',
          name: 'resale',
          component: () => import('@/components/TabResale.vue'),
          meta: { title: 'Revenda de Keys' },
        },
        {
          path: 'credits',
          name: 'credits',
          component: () => import('@/components/TabCredits.vue'),
          meta: { title: 'Comprar Créditos' },
        },
        {
          path: 'transactions',
          name: 'transactions',
          component: () => import('@/components/TabTransactions.vue'),
          meta: { title: 'Transações' },
        },
        {
          path: 'download',
          name: 'download',
          component: () => import('@/components/TabDownload.vue'),
          meta: { title: 'Download' },
        },
      ],
    },
  ],
})

const APP_NAME = 'Celerity'

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  document.title = to.meta.title ? `${to.meta.title} | ${APP_NAME}` : APP_NAME

  if (auth.token && !auth.user) {
    await auth.loadProfile()
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'license' }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'license' }
  }
})

export default router
