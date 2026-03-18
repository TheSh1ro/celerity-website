<!-- UserView.vue -->
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import TabLicense from '@/components/TabLicense.vue'
import TabResale from '@/components/TabResale.vue'
import TabCredits from '@/components/TabCredits.vue'
import TabTransactions from '@/components/TabTransactions.vue'
import TabDownload from '@/components/TabDownload.vue'

const authStore = useAuthStore()
const userStore = useUserStore()
const toastStore = useToastStore()

const activeTab = ref<'license' | 'resale' | 'credits' | 'transactions' | 'download'>('license')

onMounted(async () => {
  await Promise.all([
    userStore.loadKeys(),
    userStore.loadResalePlan(),
    userStore.loadLicensePlans(),
  ])
})

// Lazy-load transactions when the tab is first opened
watch(activeTab, (tab) => {
  if (tab === 'transactions' && userStore.transactions.length === 0) {
    userStore.loadTransactions()
  }
})

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR')
}
</script>

<template>
  <div class="page-wrapper" v-if="userStore.profile">
    <!-- ── HEADER ── -->
    <header class="app-header">
      <div class="container header-content">
        <div class="logo">
          <img src="/src/assets/logo.png" class="logo-icon" />
          <span>Celerity</span>
        </div>

        <nav class="header-nav">
          <div class="header-pill">
            <span class="pill-label">Créditos</span>
            <span class="pill-value" style="color: var(--amber)">
              {{ userStore.profile.credits }}
            </span>
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

    <!-- ── MAIN ── -->
    <main class="main-content container">
      <!-- Stats strip -->
      <div class="stats-strip">
        <div class="stat-strip-item">
          <span class="stat-strip-label">Total de Keys</span>
          <span class="stat-strip-value">{{ userStore.keyStats.total }}</span>
        </div>
        <div class="stat-strip-divider"></div>
        <div class="stat-strip-item">
          <span class="stat-strip-label">Disponíveis</span>
          <span class="stat-strip-value" style="color: var(--green)">
            {{ userStore.keyStats.available }}
          </span>
        </div>
        <div class="stat-strip-divider"></div>
        <div class="stat-strip-item">
          <span class="stat-strip-label">Usadas</span>
          <span class="stat-strip-value" style="color: var(--orange)">
            {{ userStore.keyStats.used }}
          </span>
        </div>
        <div class="stat-strip-divider"></div>
        <div class="stat-strip-item">
          <span class="stat-strip-label">Revertidas</span>
          <span class="stat-strip-value" style="color: var(--text-muted)">
            {{ userStore.keyStats.reverted }}
          </span>
        </div>
        <div class="stat-strip-spacer"></div>
        <div class="stat-strip-status">
          <span class="status-dot" :class="userStore.isExpired ? 'expired' : 'active'"></span>
          <span>{{ userStore.isExpired ? 'LICENÇA EXPIRADA' : 'LICENÇA ATIVA' }}</span>
        </div>
      </div>

      <!-- Layout: sidebar + content -->
      <div class="dash-layout">
        <!-- Sidebar -->
        <aside class="dash-sidebar">
          <nav class="side-nav">
            <div class="side-nav-header">MÓDULOS</div>
            <button
              class="side-nav-item"
              :class="{ active: activeTab === 'license' }"
              @click="activeTab = 'license'"
            >
              <span class="side-nav-icon">◧</span>
              Minha Licença
            </button>
            <button
              class="side-nav-item"
              :class="{ active: activeTab === 'resale' }"
              @click="activeTab = 'resale'"
            >
              <span class="side-nav-icon">⟳</span>
              Revenda de Keys
            </button>
            <button
              class="side-nav-item"
              :class="{ active: activeTab === 'credits' }"
              @click="activeTab = 'credits'"
            >
              <span class="side-nav-icon">◈</span>
              Comprar Créditos
            </button>
            <button
              class="side-nav-item"
              :class="{ active: activeTab === 'transactions' }"
              @click="activeTab = 'transactions'"
            >
              <span class="side-nav-icon">≡</span>
              Transações
            </button>
            <button
              v-if="!userStore.isExpired || userStore.profile.credits"
              class="side-nav-item"
              :class="{ active: activeTab === 'download' }"
              @click="activeTab = 'download'"
            >
              <span class="side-nav-icon">⬇</span>
              Download
            </button>
          </nav>

          <!-- License mini card -->
          <div class="side-license-card">
            <div class="slc-label">LICENÇA</div>
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
        </aside>

        <!-- Content -->
        <div class="dash-content">
          <TabLicense v-if="activeTab === 'license'" />
          <TabResale v-if="activeTab === 'resale'" />
          <TabCredits v-if="activeTab === 'credits'" />
          <TabTransactions v-if="activeTab === 'transactions'" />
          <TabDownload v-if="activeTab === 'download'" />
        </div>
      </div>
    </main>

    <!-- ── TOASTS ── -->
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

  <!-- Loading state -->
  <div v-else class="loading-page">
    <div class="loading-content">
      <span class="spinner" style="width: 32px; height: 32px" />
      <p class="loading-label">INICIALIZANDO SISTEMA</p>
    </div>
  </div>
</template>

<style scoped>
/* ── Page Background ── */
.page-wrapper,
.loading-page {
  min-height: 100dvh;
  background-color: #090f0b;
  background-image:
    linear-gradient(to bottom, transparent 55vh, #090f0b calc(55vh + 200px)),
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

/* ── Main ── */
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

/* ── Stats Strip ── */
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
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.stat-strip-value {
  font-family: var(--font-display);
  font-size: 1.6rem;
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
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

/* ── Dashboard Layout ── */
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

/* ── Sidebar ── */
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
  font-size: 0.7rem;
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
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-left: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
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
  font-size: 0.85rem;
}

.side-nav-item.active .side-nav-icon {
  opacity: 1;
}

/* License card */
.side-license-card {
  background: var(--bg-surface);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
  padding: var(--space-4) var(--space-5);
}

.slc-label {
  font-family: var(--font-ui);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  margin-bottom: var(--space-1);
}

.slc-value {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-bottom: var(--space-1);
}

.slc-date {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}

/* Loading */
.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.loading-label {
  font-family: var(--font-ui);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--text-muted);
}
</style>
