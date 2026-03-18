<!-- UserView.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import type { Key } from '@/stores/user'

interface Plan {
  days: number
  price: number
}

const authStore = useAuthStore()
const userStore = useUserStore()
const toastStore = useToastStore()

const activeTab = ref<'license' | 'resale' | 'credits'>('license')

const showRevertModal = ref(false)
const showBuyModal = ref(false)
const showGeneratedKeyModal = ref(false)
const showConfirmGenerateModal = ref(false)
const selectedKey = ref<Key | null>(null)
const selectedPlan = ref<Plan | null>(null)
const generatedKey = ref('')

const canGenerateKey = computed(() => {
  if (!userStore.resalePlan?.is_active) return false
  return (userStore.profile?.credits || 0) >= (userStore.resalePlan?.price || 0)
})

onMounted(async () => {
  await Promise.all([
    userStore.loadKeys(),
    userStore.loadResalePlan(),
    userStore.loadLicensePlans(),
  ])
})

async function handleGenerateKey() {
  const result = await userStore.generateKey()
  if (result.ok) {
    generatedKey.value = result.key || ''
    showGeneratedKeyModal.value = true
    toastStore.success('Key gerada com sucesso!')
  } else {
    toastStore.error(result.error || 'Erro ao gerar key')
  }
}

function confirmRevert(key: Key) {
  selectedKey.value = key
  showRevertModal.value = true
}

async function handleRevert() {
  if (!selectedKey.value) return
  const result = await userStore.revertKey(selectedKey.value.id)
  if (result.ok) {
    toastStore.success('Key revertida. Créditos devolvidos.')
    showRevertModal.value = false
  } else {
    toastStore.error(result.error || 'Erro ao reverter key')
  }
}

function confirmBuy(plan: Plan) {
  selectedPlan.value = plan
  showBuyModal.value = true
}

async function handleBuy() {
  if (!selectedPlan.value) return
  const result = await userStore.buyDays(selectedPlan.value.days)
  if (result.ok) {
    toastStore.success(result.message || 'Dias adicionados!')
    showBuyModal.value = false
  } else {
    toastStore.error(result.error || 'Erro ao comprar dias')
  }
}

function copyKey(key: string) {
  userStore.copyKey(key)
  toastStore.info('Key copiada!')
}

function keyStatusBadge(key: Key) {
  if (key.reverted) return 'badge-neutral'
  if (key.used) return 'badge-warning'
  return 'badge-success'
}

function keyStatusLabel(key: Key) {
  if (key.reverted) return 'Revertida'
  if (key.used) return 'Usada'
  return 'Disponível'
}

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
          <span>STONE</span>
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
        <!-- Sidebar nav -->
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
          </nav>

          <!-- License status mini card -->
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

        <!-- Content area -->
        <div class="dash-content">
          <!-- ═══ TAB: LICENÇA ═══════════════════════════════════ -->
          <div v-if="activeTab === 'license'" class="tab-content space-y-6">
            <!-- Status da licença -->
            <div class="card">
              <div class="card-header">
                <h2 class="card-title">Status da Licença</h2>
              </div>
              <div class="card-body">
                <div class="license-status-row">
                  <div class="license-status-block">
                    <div class="lsb-label">DIAS RESTANTES</div>
                    <div class="lsb-value" :class="userStore.isExpired ? 'text-red' : 'text-green'">
                      {{ userStore.daysLeft }}
                    </div>
                  </div>
                  <div class="license-status-block">
                    <div class="lsb-label">EXPIRA EM</div>
                    <div class="lsb-date mono">
                      {{ formatDate(userStore.profile?.software_access_until) }}
                    </div>
                  </div>
                  <div class="license-status-block">
                    <div class="lsb-label">STATUS</div>
                    <span
                      :class="['badge', userStore.isExpired ? 'badge-danger' : 'badge-success']"
                    >
                      {{ userStore.isExpired ? 'Expirada' : 'Ativa' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Planos para estender -->
          <div class="card" v-if="activeTab === 'license'">
            <div class="card-header">
              <div class="card-header-inner">
                <div>
                  <h2 class="card-title">Estender Licença</h2>
                  <p class="card-subtitle">Adicione dias de acesso usando seus créditos</p>
                </div>
              </div>
            </div>
            <div class="card-body">
              <div class="plan-grid">
                <div
                  v-for="plan in userStore.licensePlans"
                  :key="plan.days"
                  class="plan-card"
                  :class="{ featured: plan.days === 30 }"
                >
                  <div class="plan-header">
                    <h3 class="plan-name">{{ plan.days }} Dias</h3>
                    <p class="plan-description">Acesso completo</p>
                  </div>
                  <div class="plan-price">
                    <span class="plan-price-value">{{ plan.price }}</span>
                    <span class="plan-price-unit">créditos</span>
                  </div>
                  <button
                    class="btn btn-primary btn-full"
                    :disabled="
                      (userStore.profile?.credits || 0) < plan.price ||
                      userStore.loading.buyDays === plan.days
                    "
                    @click="confirmBuy(plan)"
                  >
                    <span class="spinner" v-if="userStore.loading.buyDays === plan.days" />
                    <span v-else>COMPRAR</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ═══ TAB: REVENDA ══════════════════════════════════ -->
          <div v-if="activeTab === 'resale'" class="tab-content space-y-6">
            <!-- Gerar Key -->
            <div class="card">
              <div class="card-header">
                <div class="card-header-inner">
                  <div>
                    <h2 class="card-title">Gerar Key de Revenda</h2>
                    <p class="card-subtitle">Crie keys para vender para outros usuários</p>
                  </div>
                  <div v-if="userStore.resalePlan" class="resale-plan-badge">
                    <span class="rpb-label">PLANO ATUAL</span>
                    <span class="rpb-value mono">
                      {{ userStore.resalePlan.days }}d · {{ userStore.resalePlan.price }} créditos
                    </span>
                  </div>
                </div>
              </div>
              <div class="card-body">
                <!-- How it works - expanded steps -->
                <div class="resale-how-it-works">
                  <p class="resale-hiw-title">⟳ COMO FUNCIONA A REVENDA</p>
                  <div class="resale-hiw-steps">
                    <div class="resale-hiw-step">
                      <div class="resale-hiw-step-num">1</div>
                      <div class="resale-hiw-step-body">
                        <p class="resale-hiw-step-label">GERE A KEY</p>
                        <p class="resale-hiw-step-text">
                          Clique em "Gerar Nova Key". Serão descontados
                          <strong style="color: var(--amber)"
                            >{{ userStore.resalePlan?.price }} créditos</strong
                          >
                          da sua conta e uma key de
                          <strong style="color: var(--green)"
                            >{{ userStore.resalePlan?.days }} dias</strong
                          >
                          será criada para você.
                        </p>
                      </div>
                    </div>
                    <div class="resale-hiw-connector"></div>
                    <div class="resale-hiw-step">
                      <div class="resale-hiw-step-num">2</div>
                      <div class="resale-hiw-step-body">
                        <p class="resale-hiw-step-label">VENDA PELO SEU PREÇO</p>
                        <p class="resale-hiw-step-text">
                          Repasse a key para seu cliente cobrando o valor de acordo com a sua
                          estratégia de venda. Você tem controle total sobre o seu preço.
                        </p>
                      </div>
                    </div>
                    <div class="resale-hiw-connector"></div>
                    <div class="resale-hiw-step">
                      <div class="resale-hiw-step-num">⚠</div>
                      <div class="resale-hiw-step-body">
                        <p class="resale-hiw-step-label">VENDA PELO SEU PREÇO</p>
                        <p class="resale-hiw-step-text">
                          Você lida com a venda do inicio ao fim, não entregue a chave antes de
                          receber o pagamento.
                        </p>
                      </div>
                    </div>
                    <div class="resale-hiw-connector"></div>
                    <div class="resale-hiw-step">
                      <div class="resale-hiw-step-num">3</div>
                      <div class="resale-hiw-step-body">
                        <p class="resale-hiw-step-label">CLIENTE ATIVA A CONTA</p>
                        <p class="resale-hiw-step-text">
                          O cliente usa a key na tela de login para criar sua própria conta e ter
                          acesso ao software pelo período contratado.
                        </p>
                      </div>
                    </div>
                    <div class="resale-hiw-connector"></div>
                    <div class="resale-hiw-step">
                      <div class="resale-hiw-step-num resale-hiw-step-num--warning">!</div>
                      <div class="resale-hiw-step-body">
                        <p class="resale-hiw-step-label" style="color: var(--orange)">
                          REEMBOLSO E CANCELAMENTO
                        </p>
                        <p class="resale-hiw-step-text">
                          Se a key <strong style="color: var(--green)">não foi usada</strong>, você
                          pode revertê-la a qualquer momento pela tabela abaixo e os créditos serão
                          devolvidos integralmente.
                          <br />
                          <span style="color: var(--red)"
                            >Keys já utilizadas não têm reembolso,</span
                          >
                          a ativação é irreversível.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Credit cost summary -->
                <div class="resale-cost-row">
                  <div class="resale-cost-item">
                    <span class="resale-cost-label">CUSTO POR KEY</span>
                    <span class="resale-cost-value"
                      >{{ userStore.resalePlan?.price }}
                      <span class="resale-cost-unit">créditos</span></span
                    >
                  </div>
                  <div class="resale-cost-divider"></div>
                  <div class="resale-cost-item">
                    <span class="resale-cost-label">DURAÇÃO</span>
                    <span class="resale-cost-value"
                      >{{ userStore.resalePlan?.days }}
                      <span class="resale-cost-unit">dias</span></span
                    >
                  </div>
                  <div class="resale-cost-divider"></div>
                  <div class="resale-cost-item">
                    <span class="resale-cost-label">SEUS CRÉDITOS</span>
                    <span
                      class="resale-cost-value"
                      :style="{ color: canGenerateKey ? 'var(--green)' : 'var(--red)' }"
                    >
                      {{ userStore.profile?.credits }}
                    </span>
                  </div>
                </div>

                <div style="margin-top: var(--space-5)">
                  <button
                    class="btn btn-primary btn-lg"
                    :disabled="!canGenerateKey || userStore.loading.generateKey"
                    @click="showConfirmGenerateModal = true"
                  >
                    + GERAR NOVA KEY
                  </button>
                </div>

                <p
                  v-if="!userStore.resalePlan?.is_active"
                  class="alert-inline alert-error-inline"
                  style="margin-top: var(--space-4)"
                >
                  ⚠ Plano de revenda temporariamente desativado.
                </p>
                <p
                  v-else-if="(userStore.profile?.credits || 0) < (userStore.resalePlan?.price || 0)"
                  class="alert-inline alert-warning-inline"
                  style="margin-top: var(--space-4)"
                >
                  ⚠ Créditos insuficientes. Você precisa de
                  {{ userStore.resalePlan?.price }} créditos.
                </p>
              </div>
            </div>

            <!-- Minhas Keys -->
            <div class="card">
              <div class="card-header">
                <h2 class="card-title">Minhas Keys</h2>
              </div>
              <div class="card-body" style="padding: 0">
                <div v-if="userStore.loading.keys" class="empty-state">
                  <span class="spinner" />
                  <p>Carregando...</p>
                </div>
                <div v-else-if="userStore.keys.length === 0" class="empty-state">
                  <div class="empty-state-icon">⌗</div>
                  <p>Nenhuma key gerada ainda</p>
                  <p style="font-size: 0.8rem; margin-top: var(--space-1)">
                    Gere sua primeira key acima
                  </p>
                </div>
                <table v-else>
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Criada em</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="key in userStore.keys" :key="key.id">
                      <td>
                        <span class="key-value mono">{{ key.key }}</span>
                      </td>
                      <td class="mono text-sm">{{ formatDate(key.created_at) }}</td>
                      <td>
                        <span :class="['badge', keyStatusBadge(key)]">
                          {{ keyStatusLabel(key) }}
                        </span>
                      </td>
                      <td>
                        <div v-if="!key.reverted" class="flex gap-2">
                          <button class="btn btn-ghost btn-sm" @click="copyKey(key.key)">
                            Copiar
                          </button>
                          <button
                            v-if="!key.used && !key.reverted"
                            class="btn btn-danger btn-sm"
                            :disabled="userStore.loading.revertKey === key.id"
                            @click="confirmRevert(key)"
                          >
                            <span class="spinner" v-if="userStore.loading.revertKey === key.id" />
                            <span v-else>Reverter</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ═══ TAB: CRÉDITOS ═════════════════════════════════ -->
          <div v-if="activeTab === 'credits'" class="tab-content space-y-6">
            <div class="card">
              <div class="card-header">
                <h2 class="card-title">Comprar Créditos</h2>
                <p class="card-subtitle">Adicione créditos à sua conta via Pix</p>
              </div>
              <div class="card-body">
                <div class="alert alert-info">
                  <span>◎</span>
                  <div>
                    <p style="font-weight: 700; font-size: 0.9rem; letter-spacing: 0.06em">
                      EM BREVE
                    </p>
                    <p style="font-size: 0.85rem; margin-top: 2px">
                      A integração com gateway de pagamento está sendo configurada. Entre em contato
                      com o administrador para adicionar créditos manualmente.
                    </p>
                  </div>
                </div>

                <div class="plan-grid" style="margin-top: var(--space-6); opacity: 0.45">
                  <div class="plan-card">
                    <div class="plan-header">
                      <h3 class="plan-name">10 Créditos</h3>
                    </div>
                    <div class="plan-price">
                      <span class="plan-price-value" style="color: var(--text-muted)"
                        >R$&thinsp;10</span
                      >
                    </div>
                    <button class="btn btn-secondary btn-full" disabled>INDISPONÍVEL</button>
                  </div>
                  <div class="plan-card">
                    <div class="plan-header">
                      <h3 class="plan-name">20 Créditos</h3>
                    </div>
                    <div class="plan-price">
                      <span class="plan-price-value" style="color: var(--text-muted)"
                        >R$&thinsp;20</span
                      >
                    </div>
                    <button class="btn btn-secondary btn-full" disabled>INDISPONÍVEL</button>
                  </div>
                  <div class="plan-card featured">
                    <div class="plan-header">
                      <h3 class="plan-name">30 Créditos</h3>
                    </div>
                    <div class="plan-price">
                      <span class="plan-price-value" style="color: var(--text-muted)"
                        >R$&thinsp;30</span
                      >
                    </div>
                    <button class="btn btn-secondary btn-full" disabled>INDISPONÍVEL</button>
                  </div>
                  <div class="plan-card">
                    <div class="plan-header">
                      <h3 class="plan-name">100 Créditos</h3>
                    </div>
                    <div class="plan-price">
                      <span class="plan-price-value" style="color: var(--text-muted)"
                        >R$&thinsp;100</span
                      >
                    </div>
                    <button class="btn btn-secondary btn-full" disabled>INDISPONÍVEL</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- end dash-content -->
      </div>
      <!-- end dash-layout -->
    </main>

    <!-- ── MODAL: Confirmar Geração de Key ── -->
    <div
      v-if="showConfirmGenerateModal"
      class="modal-overlay"
      @click.self="showConfirmGenerateModal = false"
    >
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Confirmar Geração de Key</h3>
        </div>
        <div class="modal-body">
          <p style="color: var(--text-secondary); margin-bottom: var(--space-4)">
            Você está prestes a gerar uma key de revenda com plano inicial de
            <strong style="color: var(--text-primary)">{{ userStore.resalePlan?.days }} dias</strong
            >.
          </p>
          <div class="confirm-row">
            <span class="confirm-label">CRÉDITOS DESCONTADOS</span>
            <span class="confirm-value mono">{{ userStore.resalePlan?.price }} créditos</span>
          </div>

          <!-- Revert policy info -->
          <div class="modal-policy-box modal-policy-ok">
            <span class="modal-policy-icon">✓</span>
            <p>
              Key <strong>não utilizada</strong> pode ser revertida a qualquer momento, seus
              créditos serão devolvidos integralmente.
            </p>
          </div>
          <div class="modal-policy-box modal-policy-warn">
            <span class="modal-policy-icon">⚠</span>
            <p>
              Key <strong>já utilizada não tem reembolso</strong>. Após o cliente ativar a key, a
              operação é irreversível.
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showConfirmGenerateModal = false">Cancelar</button>
          <button
            class="btn btn-primary"
            :disabled="userStore.loading.generateKey"
            @click="((showConfirmGenerateModal = false), handleGenerateKey())"
          >
            <span class="spinner" v-if="userStore.loading.generateKey" />
            <span v-else>Confirmar e Gerar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: Reverter Key ── -->
    <div v-if="showRevertModal" class="modal-overlay" @click.self="showRevertModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">⚠ Reverter Key</h3>
        </div>
        <div class="modal-body">
          <p style="color: var(--text-secondary); margin-bottom: var(--space-4)">
            Tem certeza que deseja reverter esta key?
          </p>
          <div class="key-display">
            <span class="key-value mono">{{ selectedKey?.key }}</span>
          </div>
          <p class="form-hint" style="margin-top: var(--space-3)">
            Os créditos serão devolvidos e a key será invalidada permanentemente.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showRevertModal = false">Cancelar</button>
          <button class="btn btn-danger" @click="handleRevert">Reverter Key</button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: Comprar Dias ── -->
    <div v-if="showBuyModal" class="modal-overlay" @click.self="showBuyModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Confirmar Compra</h3>
        </div>
        <div class="modal-body">
          <p style="color: var(--text-secondary)">
            Adicionar
            <strong style="color: var(--text-primary)">{{ selectedPlan?.days }} dias</strong> à sua
            licença?
          </p>
          <div class="confirm-row">
            <span class="confirm-label">CUSTO TOTAL</span>
            <span class="confirm-value mono">{{ selectedPlan?.price }} créditos</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showBuyModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="handleBuy">Confirmar</button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: Key Gerada ── -->
    <div
      v-if="showGeneratedKeyModal"
      class="modal-overlay"
      @click.self="showGeneratedKeyModal = false"
    >
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title" style="color: var(--green)">✓ Key Gerada</h3>
        </div>
        <div class="modal-body">
          <p class="form-hint" style="margin-bottom: var(--space-4)">
            Copie a key abaixo. Ela não será exibida novamente.
          </p>
          <div class="key-display">
            <span class="key-value mono">{{ generatedKey }}</span>
            <button class="btn btn-primary btn-sm" @click="copyKey(generatedKey)">Copiar</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="showGeneratedKeyModal = false">Fechar</button>
        </div>
      </div>
    </div>

    <!-- ── TOASTS ── -->
    <div class="toast-container">
      <div
        v-for="toast in useToastStore().toasts"
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

  background:
    linear-gradient(to bottom, transparent 80%, #090f0b 100%),
    url('@/assets/background.png') top center / 100% auto no-repeat,
    #090f0b;
}

.loading-page {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Main Layout ── */
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
  gap: 0;
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
  font-size: 0.65rem;
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
  font-size: 0.72rem;
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
  font-size: 0.65rem;
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
  font-size: 0.9rem;
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

/* License card in sidebar */
.side-license-card {
  background: var(--bg-surface);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
  padding: var(--space-4) var(--space-5);
}

.slc-label {
  font-family: var(--font-ui);
  font-size: 0.65rem;
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
  font-size: 0.75rem;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}

/* ── Cards ── */
.card-header-inner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.card-title {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-primary);
  margin-bottom: 3px;
}

.card-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

/* Credit badge */
.credit-badge {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  background: var(--amber-dim);
  border: 1px solid rgba(200, 164, 52, 0.25);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-4);
}

.credit-badge-label {
  font-family: var(--font-ui);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: rgba(200, 164, 52, 0.6);
}

.credit-badge-value {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--amber);
}

.credit-badge-unit {
  font-size: 0.8rem;
  color: rgba(200, 164, 52, 0.6);
}

/* Resale plan badge */
.resale-plan-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.rpb-label {
  font-family: var(--font-ui);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  text-transform: uppercase;
}

.rpb-value {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

/* License status row */
.license-status-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}

@media (max-width: 600px) {
  .license-status-row {
    grid-template-columns: 1fr;
  }
}

.license-status-block {
  padding: var(--space-5);
  background: var(--bg-void);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
}

.lsb-label {
  font-family: var(--font-ui);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  margin-bottom: var(--space-2);
}

.lsb-value {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
}

.lsb-date {
  font-size: 1rem;
  color: var(--text-secondary);
}

.text-red {
  color: var(--red);
}
.text-green {
  color: var(--green);
}

/* Info box */
.info-box {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  background: var(--amber-dim);
  border: 1px solid rgba(200, 164, 52, 0.2);
  border-left: 3px solid var(--amber);
  border-radius: var(--radius-sm);
}

.info-box-icon {
  color: var(--amber);
  font-size: 1rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.info-box-title {
  font-family: var(--font-ui);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--amber);
  margin-bottom: var(--space-1);
}

.info-box-text {
  font-size: 0.875rem;
  color: rgba(200, 164, 52, 0.7);
  line-height: 1.5;
}

/* Inline alerts */
.alert-inline {
  font-family: var(--font-ui);
  font-size: 0.875rem;
  letter-spacing: 0.04em;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  border-left: 3px solid;
}

.alert-error-inline {
  background: var(--red-dim);
  border-color: var(--red);
  color: #e8a0a0;
}
.alert-warning-inline {
  background: var(--orange-dim);
  border-color: var(--orange);
  color: #d4a060;
}

/* Modal confirm row */
.confirm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-5);
  padding: var(--space-4) var(--space-5);
  background: var(--bg-void);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
}

.confirm-label {
  font-family: var(--font-ui);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.confirm-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--amber);
}

/* Loading content */
.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.loading-label {
  font-family: var(--font-ui);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--text-muted);
}

/* ── Resale How It Works ── */
.resale-how-it-works {
  background: var(--bg-void);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
  padding: var(--space-5);
}

.resale-hiw-title {
  font-family: var(--font-ui);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--amber);
  margin-bottom: var(--space-4);
}

.resale-hiw-steps {
  display: flex;
  flex-direction: column;
}

.resale-hiw-connector {
  width: 1px;
  height: 16px;
  background: var(--wire);
  margin-left: 14px;
}

.resale-hiw-step {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

.resale-hiw-step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--amber-dim);
  border: 1px solid rgba(200, 164, 52, 0.3);
  color: var(--amber);
  font-family: var(--font-ui);
  font-size: 0.72rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.resale-hiw-step-num--warning {
  background: rgba(220, 100, 60, 0.12);
  border-color: rgba(220, 100, 60, 0.3);
  color: var(--orange);
}

.resale-hiw-step-body {
  padding-bottom: 2px;
}

.resale-hiw-step-label {
  font-family: var(--font-ui);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  margin-bottom: 3px;
}

.resale-hiw-step-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.55;
}

/* ── Resale Cost Row ── */
.resale-cost-row {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--bg-surface);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
  padding: var(--space-4) var(--space-5);
  margin-top: var(--space-4);
}

.resale-cost-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 var(--space-5);
}

.resale-cost-item:first-child {
  padding-left: 0;
}

.resale-cost-label {
  font-family: var(--font-ui);
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.resale-cost-value {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--amber);
  line-height: 1;
}

.resale-cost-unit {
  font-size: 0.75rem;
  font-family: var(--font-ui);
  color: var(--text-muted);
  font-weight: 400;
}

.resale-cost-divider {
  width: 1px;
  height: 32px;
  background: var(--wire);
  flex-shrink: 0;
}

/* ── Modal policy boxes ── */
.modal-policy-box {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  margin-top: var(--space-3);
  font-size: 0.85rem;
  line-height: 1.5;
}

.modal-policy-ok {
  background: rgba(60, 180, 100, 0.08);
  border: 1px solid rgba(60, 180, 100, 0.2);
  color: rgba(120, 200, 140, 0.85);
}

.modal-policy-warn {
  background: var(--red-dim);
  border: 1px solid rgba(200, 80, 80, 0.25);
  color: #e8a0a0;
}

.modal-policy-icon {
  flex-shrink: 0;
  font-size: 0.85rem;
  margin-top: 1px;
}
</style>
