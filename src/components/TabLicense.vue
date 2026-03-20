<!-- components/TabLicense.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'

interface Plan {
  days: number
  price: number
}

const userStore = useUserStore()
const toastStore = useToastStore()

const showBuyModal = ref(false)
const selectedPlan = ref<Plan | null>(null)

function formatDate(date: string | null | undefined) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR')
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
</script>

<template>
  <div class="tab-content space-y-6">
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
            <span :class="['badge', userStore.isExpired ? 'badge-danger' : 'badge-success']">
              {{ userStore.isExpired ? 'Expirada' : 'Ativa' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Planos para estender -->
    <div class="card">
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
</template>

<style scoped>
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
  font-size: var(--text-2xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  margin-bottom: var(--space-2);
}

.lsb-value {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  font-weight: 700;
  line-height: 1;
}

.lsb-date {
  font-size: var(--text-base);
  color: var(--text-secondary);
}

.text-red {
  color: var(--red);
}
.text-green {
  color: var(--green);
}

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
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.confirm-value {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--amber);
}
</style>
