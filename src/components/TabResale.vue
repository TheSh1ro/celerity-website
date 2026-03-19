<!-- components/TabResale.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import type { Key, ResalePlan } from '@/stores/user'

const userStore = useUserStore()
const toastStore = useToastStore()

const showRevertModal = ref(false)
const howItWorksOpen = ref(false)
const showGeneratedKeyModal = ref(false)
const showConfirmGenerateModal = ref(false)
const selectedKey = ref<Key | null>(null)
const generatedKey = ref('')
const selectedPlanDays = ref<number | null>(null)

// Auto-select first available plan
const selectedPlan = computed<ResalePlan | null>(() => {
  if (!userStore.resalePlans.length) return null
  const days = selectedPlanDays.value
  return userStore.resalePlans.find((p) => p.duration_days === days) ?? null
})

function selectPlan(plan: ResalePlan) {
  selectedPlanDays.value = plan.duration_days
}

const canGenerateKey = computed(() => {
  if (!selectedPlan.value) return false
  return (userStore.profile?.credits || 0) >= selectedPlan.value.price
})

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR')
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

function copyKey(key: string) {
  userStore.copyKey(key)
  toastStore.info('Key copiada!')
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

async function handleGenerateKey() {
  if (!selectedPlan.value) return
  const result = await userStore.generateKey(selectedPlan.value.duration_days)
  if (result.ok) {
    generatedKey.value = result.key || ''
    showGeneratedKeyModal.value = true
    toastStore.success('Key gerada com sucesso!')
  } else {
    toastStore.error(result.error || 'Erro ao gerar key')
  }
  showConfirmGenerateModal.value = false
}
</script>

<template>
  <div class="tab-content space-y-6">
    <!-- Gerar Key -->
    <div class="card">
      <div class="card-header">
        <div class="card-header-inner">
          <div>
            <h2 class="card-title">Gerar Key de Revenda</h2>
            <p class="card-subtitle">Crie keys para vender para outros usuários</p>
          </div>
        </div>
      </div>
      <div class="card-body">
        <!-- Plan selector -->
        <div v-if="userStore.resalePlans.length > 0" style="margin-bottom: var(--space-4)">
          <p class="resale-section-label">SELECIONE O PLANO</p>
          <div class="plan-selector">
            <button
              v-for="plan in userStore.resalePlans"
              :key="plan.duration_days"
              class="plan-card"
              :class="{ 'is-selected': selectedPlan?.duration_days === plan.duration_days }"
              @click="selectPlan(plan)"
            >
              <span class="plan-card-days">{{ plan.duration_days }}<small>d</small></span>
              <span class="plan-card-price">{{ plan.price }} <small>créditos</small></span>
            </button>
          </div>
        </div>

        <div
          v-else-if="userStore.loading.resalePlans"
          class="empty-state"
          style="padding: var(--space-6)"
        >
          <span class="spinner" />
          <p>Carregando planos...</p>
        </div>

        <div v-else class="alert-inline alert-error-inline">
          ⚠ Nenhum plano de revenda disponível no momento.
        </div>

        <!-- How it works -->
        <div
          v-if="userStore.resalePlans.length > 0"
          class="resale-how-it-works"
          :class="{ 'is-open': howItWorksOpen }"
          style="margin-top: var(--space-4)"
        >
          <button class="resale-hiw-header" @click="howItWorksOpen = !howItWorksOpen">
            <span class="resale-hiw-title">COMO FUNCIONA A REVENDA</span>
            <span class="resale-hiw-chevron" :class="{ 'is-rotated': howItWorksOpen }">▾</span>
          </button>
          <div class="resale-hiw-body" v-show="howItWorksOpen">
            <div class="resale-hiw-steps">
              <div class="resale-hiw-step">
                <div class="resale-hiw-step-num">1</div>
                <div class="resale-hiw-step-body">
                  <p class="resale-hiw-step-label">GERE A KEY</p>
                  <p class="resale-hiw-step-text">
                    Selecione um plano e clique em "Gerar Nova Key". Serão descontados
                    <strong style="color: var(--amber)">{{ selectedPlan?.price }} créditos</strong>
                    da sua conta e uma key de
                    <strong style="color: var(--green)"
                      >{{ selectedPlan?.duration_days }} dias</strong
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
                    Repasse a key para seu cliente cobrando o valor de acordo com a sua estratégia
                    de venda. Você tem controle total sobre o seu preço.
                  </p>
                </div>
              </div>
              <div class="resale-hiw-connector"></div>
              <div class="resale-hiw-step">
                <div class="resale-hiw-step-num">⚠</div>
                <div class="resale-hiw-step-body">
                  <p class="resale-hiw-step-label">ATENÇÃO</p>
                  <p class="resale-hiw-step-text">
                    Você lida com a venda do início ao fim. Não entregue a chave antes de receber o
                    pagamento.
                  </p>
                </div>
              </div>
              <div class="resale-hiw-connector"></div>
              <div class="resale-hiw-step">
                <div class="resale-hiw-step-num">3</div>
                <div class="resale-hiw-step-body">
                  <p class="resale-hiw-step-label">CLIENTE ATIVA A CONTA</p>
                  <p class="resale-hiw-step-text">
                    O cliente usa a key na tela de login para criar sua própria conta e ter acesso
                    ao software pelo período contratado.
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
                    Se a key <strong style="color: var(--green)">não foi usada</strong>, você pode
                    revertê-la a qualquer momento pela tabela abaixo e os créditos serão devolvidos
                    integralmente.
                    <br />
                    <span style="color: var(--red)">Keys já utilizadas não têm reembolso,</span>
                    a ativação é irreversível.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Credit cost summary -->
        <div v-if="selectedPlan" class="resale-cost-row">
          <div class="resale-cost-item">
            <span class="resale-cost-label">CUSTO POR KEY</span>
            <span class="resale-cost-value">
              {{ selectedPlan.price }}
              <span class="resale-cost-unit">créditos</span>
            </span>
          </div>
          <div class="resale-cost-divider"></div>
          <div class="resale-cost-item">
            <span class="resale-cost-label">DURAÇÃO</span>
            <span class="resale-cost-value">
              {{ selectedPlan.duration_days }}
              <span class="resale-cost-unit">dias</span>
            </span>
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

        <div v-if="selectedPlan" style="margin-top: var(--space-5)">
          <button
            class="btn btn-primary btn-lg"
            :disabled="!canGenerateKey || userStore.loading.generateKey"
            @click="showConfirmGenerateModal = true"
          >
            + GERAR NOVA KEY
          </button>
        </div>

        <p
          v-if="selectedPlan && (userStore.profile?.credits || 0) < selectedPlan.price"
          class="alert-inline alert-warning-inline"
          style="margin-top: var(--space-4)"
        >
          ⚠ Créditos insuficientes. Você precisa de {{ selectedPlan.price }} créditos.
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
          <p style="font-size: 0.85rem; margin-top: var(--space-1)">Gere sua primeira key acima</p>
        </div>
        <table v-else>
          <thead>
            <tr>
              <th>Key</th>
              <th>Duração</th>
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
              <td class="mono text-sm">{{ key.duration_days }}d</td>
              <td class="mono text-sm">{{ formatDate(key.created_at) }}</td>
              <td>
                <span :class="['badge', keyStatusBadge(key)]">
                  {{ keyStatusLabel(key) }}
                </span>
              </td>
              <td>
                <div v-if="!key.reverted" class="flex gap-2">
                  <button class="btn btn-ghost btn-sm" @click="copyKey(key.key)">Copiar</button>
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
        <div class="confirm-row">
          <div>
            <p class="confirm-label">PLANO SELECIONADO</p>
            <p class="confirm-value">{{ selectedPlan?.duration_days }} dias</p>
          </div>
          <div style="text-align: right">
            <p class="confirm-label">CUSTO</p>
            <p class="confirm-value">{{ selectedPlan?.price }} créditos</p>
          </div>
        </div>
        <div class="modal-policy-box modal-policy-ok" style="margin-top: var(--space-4)">
          <span class="modal-policy-icon">✓</span>
          <span>
            Uma key de <strong>{{ selectedPlan?.duration_days }} dias</strong> será gerada e
            <strong>{{ selectedPlan?.price }} créditos</strong> serão descontados da sua conta.
          </span>
        </div>
        <div class="modal-policy-box modal-policy-warn">
          <span class="modal-policy-icon">⚠</span>
          <span>
            Após a geração, a key só pode ser revertida se
            <strong>não tiver sido utilizada</strong>.
          </span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="showConfirmGenerateModal = false">Cancelar</button>
        <button
          class="btn btn-primary"
          :disabled="userStore.loading.generateKey"
          @click="handleGenerateKey"
        >
          <span class="spinner" v-if="userStore.loading.generateKey" />
          <span v-else>Confirmar e Gerar</span>
        </button>
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
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: var(--space-3)">
          Copie a key abaixo e envie ao seu cliente. Ela também aparece na sua lista de keys.
        </p>
        <div
          class="mono"
          style="
            background: var(--bg-void);
            border: 1px solid var(--wire-active);
            border-radius: var(--radius-sm);
            padding: var(--space-4) var(--space-5);
            font-size: 0.95rem;
            color: var(--amber);
            word-break: break-all;
            letter-spacing: 0.04em;
          "
        >
          {{ generatedKey }}
        </div>
        <button
          class="btn btn-ghost btn-sm"
          style="margin-top: var(--space-3)"
          @click="copyKey(generatedKey)"
        >
          Copiar Key
        </button>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" @click="showGeneratedKeyModal = false">Fechar</button>
      </div>
    </div>
  </div>

  <!-- ── MODAL: Confirmar Reversão ── -->
  <div v-if="showRevertModal" class="modal-overlay" @click.self="showRevertModal = false">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title" style="color: var(--red)">⚠ Reverter Key</h3>
      </div>
      <div class="modal-body">
        <p style="color: var(--text-secondary)">
          Tem certeza que deseja reverter esta key? Os créditos serão devolvidos integralmente.
        </p>
        <p class="mono" style="color: var(--amber); margin-top: var(--space-3); font-size: 0.88rem">
          {{ selectedKey?.key }}
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="showRevertModal = false">Cancelar</button>
        <button
          class="btn btn-danger"
          :disabled="userStore.loading.revertKey === selectedKey?.id"
          @click="handleRevert"
        >
          <span class="spinner" v-if="userStore.loading.revertKey === selectedKey?.id" />
          <span v-else>Reverter</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Plan selector */
.resale-section-label {
  font-family: var(--font-ui);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  margin-bottom: var(--space-3);
}

.plan-selector {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.plan-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-4) var(--space-6);
  background: var(--bg-surface);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
  min-width: 100px;
}

.plan-card:hover {
  border-color: var(--wire-active);
  background: rgba(255, 255, 255, 0.03);
}

.plan-card.is-selected {
  border-color: var(--amber);
  background: var(--amber-dim);
}

.plan-card-days {
  font-family: var(--font-display);
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.plan-card.is-selected .plan-card-days {
  color: var(--amber);
}

.plan-card-days small {
  font-size: 1rem;
  font-weight: 400;
  color: var(--text-muted);
  margin-left: 1px;
}

.plan-card-price {
  font-family: var(--font-ui);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
}

.plan-card.is-selected .plan-card-price {
  color: rgba(200, 164, 52, 0.75);
}

.plan-card-price small {
  font-weight: 400;
}

/* How it works */
.resale-how-it-works {
  background: var(--bg-void);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: border-color 0.2s;
}

.resale-how-it-works.is-open {
  border-color: rgba(200, 164, 52, 0.35);
}

.resale-hiw-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  background: transparent;
  border: none;
  cursor: pointer;
  gap: var(--space-3);
  transition: background 0.15s;
}

.resale-hiw-header:hover {
  background: rgba(255, 255, 255, 0.03);
}

.resale-hiw-body {
  padding: 0 var(--space-5) var(--space-5);
}

.resale-hiw-chevron {
  font-size: 1rem;
  color: var(--amber);
  transition: transform 0.2s ease;
  flex-shrink: 0;
  line-height: 1;
}

.resale-hiw-chevron.is-rotated {
  transform: rotate(-180deg);
}

.resale-hiw-title {
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--amber);
  margin-bottom: 0;
}

.resale-hiw-steps {
  display: flex;
  flex-direction: column;
  margin-top: var(--space-3);
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
  font-size: 0.75rem;
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
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  margin-bottom: 3px;
}

.resale-hiw-step-text {
  font-family: var(--font-body);
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.55;
}

/* Cost row */
.resale-cost-row {
  display: flex;
  align-items: center;
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
  font-size: 0.68rem;
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
  font-size: 0.78rem;
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

/* Inline alerts */
.alert-inline {
  font-family: var(--font-body);
  font-size: 0.9rem;
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

/* Confirm row */
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
  font-size: 0.76rem;
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

/* Modal policy boxes */
.modal-policy-box {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  margin-top: var(--space-3);
  font-family: var(--font-body);
  font-size: 0.9rem;
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
  font-size: 0.9rem;
  margin-top: 1px;
}
</style>
