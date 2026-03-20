<!-- UserView.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import {
  PanelLeft,
  RefreshCw,
  CreditCard,
  ArrowLeftRight,
  Download,
  Users,
  ShieldCheck,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'

const authStore = useAuthStore()
const userStore = useUserStore()
const toastStore = useToastStore()

// ── Online users counter (fake / demo) ──
const TOTAL_REGISTERED = 11
const onlineCount = ref(0)
let onlineInterval: ReturnType<typeof setInterval> | null = null

function seededValue(seed: number, min: number, max: number): number {
  const h = ((seed * 2654435761) >>> 0) ^ (seed >>> 16)
  return min + (h % (max - min + 1))
}

function refreshOnline() {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000
  const br = new Date(utc - 3 * 60 * 60 * 1000)
  const hour = br.getHours()
  const seed = br.getFullYear() * 1000000 + (br.getMonth() + 1) * 10000 + br.getDate() * 100 + hour
  onlineCount.value = hour >= 12 && hour < 22 ? seededValue(seed, 1, 4) : 0
}

onMounted(async () => {
  refreshOnline()
  onlineInterval = setInterval(refreshOnline, 30_000)
  await Promise.all([
    userStore.loadKeys(),
    userStore.loadResalePlans(),
    userStore.loadLicensePlans(),
  ])
})

onUnmounted(() => {
  if (onlineInterval) clearInterval(onlineInterval)
})

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR')
}
</script>

<template>
  <div class="page-wrapper" v-if="userStore.profile">
    <header class="app-header">
      <div class="container header-content">
        <div class="logo">
          <img src="/src/assets/logo.png" class="logo-icon" />
          <span>Celerity</span>
        </div>
        <nav class="header-nav">
          <div class="header-pill">
            <span class="pill-label">Créditos</span>
            <span class="pill-value" style="color: var(--amber)">{{
              userStore.profile.credits
            }}</span>
          </div>
          <div class="header-pill">
            <span class="pill-label">Licença</span>
            <span
              class="pill-value"
              :style="{ color: userStore.isExpired ? 'var(--red)' : 'var(--green)' }"
            >
              {{ userStore.isExpired ? 'EXPIRADA' : `${userStore.daysLeft}d` }}
            </span>
          </div>
          <div class="header-pill">
            <span class="pill-label">Soldado</span>
            <span class="pill-value mono">{{ userStore.profile.username }}</span>
          </div>
          <button class="btn btn-ghost" @click="authStore.logout">Sair</button>
        </nav>
      </div>
    </header>

    <main class="main-content container">
      <div class="stats-strip">
        <div class="stat-strip-item">
          <span class="stat-strip-label">Total de Keys</span>
          <span class="stat-strip-value">{{ userStore.keyStats.total }}</span>
        </div>
        <div class="stat-strip-divider"></div>
        <div class="stat-strip-item">
          <span class="stat-strip-label">Disponíveis</span>
          <span class="stat-strip-value" style="color: var(--green)">{{
            userStore.keyStats.available
          }}</span>
        </div>
        <div class="stat-strip-divider"></div>
        <div class="stat-strip-item">
          <span class="stat-strip-label">Usadas</span>
          <span class="stat-strip-value" style="color: var(--orange)">{{
            userStore.keyStats.used
          }}</span>
        </div>
        <div class="stat-strip-divider"></div>
        <div class="stat-strip-item">
          <span class="stat-strip-label">Revertidas</span>
          <span class="stat-strip-value" style="color: var(--text-muted)">{{
            userStore.keyStats.reverted
          }}</span>
        </div>
        <div class="stat-strip-spacer"></div>
        <div class="stat-strip-status">
          <span class="status-dot" :class="userStore.isExpired ? 'expired' : 'active'"></span>
          <span>{{ userStore.isExpired ? 'LICENÇA EXPIRADA' : 'LICENÇA ATIVA' }}</span>
        </div>
      </div>

      <div class="dash-layout">
        <aside class="dash-sidebar">
          <nav class="side-nav">
            <div class="side-nav-header">MÓDULOS</div>
            <RouterLink class="side-nav-item" :to="{ name: 'license' }" active-class="active">
              <PanelLeft class="side-nav-icon" />Minha Licença
            </RouterLink>
            <RouterLink class="side-nav-item" :to="{ name: 'resale' }" active-class="active">
              <RefreshCw class="side-nav-icon" />Revenda de Keys
            </RouterLink>
            <RouterLink class="side-nav-item" :to="{ name: 'credits' }" active-class="active">
              <CreditCard class="side-nav-icon" />Comprar Créditos
            </RouterLink>
            <RouterLink class="side-nav-item" :to="{ name: 'transactions' }" active-class="active">
              <ArrowLeftRight class="side-nav-icon" />Transações
            </RouterLink>
            <RouterLink
              v-if="!userStore.isExpired || userStore.profile.credits"
              class="side-nav-item"
              :to="{ name: 'download' }"
              active-class="active"
            >
              <Download class="side-nav-icon" />Download
            </RouterLink>
          </nav>

          <div class="side-license-card">
            <div class="slc-label"><ShieldCheck class="slc-icon" />LICENÇA</div>
            <div
              class="slc-value"
              :style="{ color: userStore.isExpired ? 'var(--red)' : 'var(--green)' }"
            >
              {{ userStore.isExpired ? 'EXPIRADA' : `${userStore.daysLeft} DIAS` }}
            </div>
            <div class="slc-date">
              Expira: {{ formatDate(userStore.profile?.software_access_until) }}
            </div>
          </div>

          <div class="side-online-card">
            <div class="soc-header">
              <span class="soc-label"><Users class="soc-icon" />USUÁRIOS</span>
              <span class="soc-pulse" :class="onlineCount > 0 ? 'live' : 'idle'"></span>
            </div>
            <div class="soc-row">
              <span class="soc-metric-label">Online agora</span>
              <span class="soc-metric-value" :class="onlineCount > 0 ? 'online' : 'zero'">{{
                onlineCount
              }}</span>
            </div>
            <div class="soc-divider"></div>
            <div class="soc-row">
              <span class="soc-metric-label">Registrados</span>
              <span class="soc-metric-value total">{{ TOTAL_REGISTERED }}</span>
            </div>
          </div>
        </aside>

        <div class="dash-content">
          <RouterView />
        </div>
      </div>
    </main>

    <div class="toast-container">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
      >
        <span>{{ toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : '◎' }}</span>
        {{ toast.message }}
      </div>
    </div>
  </div>

  <div v-else class="loading-page">
    <div class="loading-content">
      <span class="spinner" style="width: 32px; height: 32px" />
      <p class="loading-label">INICIALIZANDO SISTEMA</p>
    </div>
  </div>
</template>

<style scoped>
.page-wrapper,
.loading-page {
  min-height: 100dvh;
  background-color: var(--text-on-accent);
  background-image:
    linear-gradient(to bottom, transparent 55vh, var(--bg-void) calc(55vh + 200px)),
    url('@/assets/background.png'), url('@/assets/background_repeat.png');
  background-position:
    top center,
    top center,
    top center;
  background-repeat: no-repeat, no-repeat, repeat-y;
  background-size:
    100% auto,
    100% auto,
    100% auto;
}

.loading-page {
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-content {
  width: 100%;
  padding-top: var(--space-6);
  padding-bottom: var(--space-8);
  flex: 1;
}

.dash-content {
  display: grid;
  gap: var(--space-6);
}

.stats-strip {
  display: flex;
  align-items: center;
  background: var(--bg-surface);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
  padding: var(--space-4) var(--space-6);
  margin-bottom: var(--space-6);
  overflow: hidden;
}

.stat-strip-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 var(--space-5);
}
.stat-strip-item:first-child {
  padding-left: 0;
}

.stat-strip-label {
  font-family: var(--font-ui);
  font-size: var(--text-2xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.stat-strip-value {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.stat-strip-divider {
  width: 1px;
  height: 36px;
  background: var(--wire);
  flex-shrink: 0;
}
.stat-strip-spacer {
  flex: 1;
}

.stat-strip-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.dash-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: var(--space-6);
  align-items: start;
}

@media (max-width: 768px) {
  .dash-layout {
    grid-template-columns: 1fr;
  }
  .dash-sidebar {
    display: none;
  }
}

.dash-sidebar {
  position: sticky;
  top: 76px;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.side-nav {
  background: var(--bg-surface);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.side-nav-header {
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-ui);
  font-size: var(--text-2xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--text-disabled);
  background: var(--bg-void);
  border-bottom: 1px solid var(--wire);
}

.side-nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-ui);
  font-size: var(--text-base);
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-left: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
  text-decoration: none;
}

.side-nav-item:hover {
  color: var(--text-secondary);
  background: var(--bg-elevated);
}
.side-nav-item.active {
  color: var(--amber);
  border-left-color: var(--amber);
  background: var(--amber-dim);
}
.side-nav-icon {
  opacity: 0.5;
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}
.side-nav-item.active .side-nav-icon {
  opacity: 1;
}

.slc-label {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.slc-icon {
  width: 12px;
  height: 12px;
  opacity: 0.7;
}

.soc-label {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.soc-icon {
  width: 12px;
  height: 12px;
  opacity: 0.7;
}

.side-license-card {
  background: var(--bg-surface);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
  padding: var(--space-4) var(--space-5);
}

.slc-label {
  font-family: var(--font-ui);
  font-size: var(--text-2xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  margin-bottom: var(--space-1);
}

.slc-value {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-bottom: var(--space-1);
}
.slc-date {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
  letter-spacing: 0.04em;
}

/* Online users card */
.side-online-card {
  background: var(--bg-surface);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
  padding: var(--space-4) var(--space-5);
}

.soc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.soc-label {
  font-family: var(--font-ui);
  font-size: var(--text-2xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.soc-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.soc-pulse.idle {
  background: var(--text-disabled);
}
.soc-pulse.live {
  background: var(--green);
  animation: pulse-live 2s infinite;
}

@keyframes pulse-live {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--green) 60%, transparent);
  }
  70% {
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--green) 0%, transparent);
  }
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--green) 0%, transparent);
  }
}

.soc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-1) 0;
}

.soc-metric-label {
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  color: var(--text-muted);
  letter-spacing: 0.04em;
}

.soc-metric-value {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  line-height: 1;
}
.soc-metric-value.online {
  color: var(--green);
}
.soc-metric-value.zero {
  color: var(--text-disabled);
}
.soc-metric-value.total {
  color: var(--text-primary);
}

.soc-divider {
  height: 1px;
  background: var(--wire);
  margin: var(--space-2) 0;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.loading-label {
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--text-muted);
}
</style>
