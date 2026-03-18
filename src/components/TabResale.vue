<!-- components/TabResale.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useToastStore } from '@/stores/toast'
import type { Key } from '@/stores/user'

const userStore = useUserStore()
const toastStore = useToastStore()

const showRevertModal = ref(false)
const showGeneratedKeyModal = ref(false)
const showConfirmGenerateModal = ref(false)
const selectedKey = ref<Key | null>(null)
const generatedKey = ref('')

const canGenerateKey = computed(() => {
  if (!userStore.resalePlan?.is_active) return false
  return (userStore.profile?.credits || 0) >= (userStore.resalePlan?.price || 0)
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
  const result = await userStore.generateKey()
  if (result.ok) {
    generatedKey.value = result.key || ''
    showGeneratedKeyModal.value = true
    toastStore.success('Key gerada com sucesso!')
  } else {
    toastStore.error(result.error || 'Erro ao gerar key')
  }
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
          <div v-if="userStore.resalePlan" class="resale-plan-badge">
            <span class="rpb-label">PLANO ATUAL</span>
            <span class="rpb-value mono">
              {{ userStore.resalePlan.days }}d · {{ userStore.resalePlan.price }} créditos
            </span>
          </div>
        </div>
      </div>
      <div class="card-body">
        <!-- How it works -->
        <div class="resale-how-it-works">
          <p class="resale-hiw-title">⟳ COMO FUNCIONA A REVENDA</p>
          <div class="resale-hiw-steps">
            <div class="resale-hiw-step">
              <div class="resale-hiw-step-num">1</div>
              <div class="resale-hiw-step-body">
                <p class="resale-hiw-step-label">GERE A KEY</p>
                <p class="resale-hiw-step-text">
                  Clique em "Gerar Nova Key". Serão descontados
                  <strong style="color: var(--amber)">{{ userStore.resalePlan?.price }} créditos</strong>
                  da sua conta e uma key de
                  <strong style="color: var(--green)">{{ userStore.resalePlan?.days }} dias</strong>
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
                  Repasse a key para seu cliente cobrando o valor de acordo com a sua estratégia de
                  venda. Você tem controle total sobre o seu preço.
                </p>
              </div>
            </div>
            <div class="resale-hiw-connector"></div>
            <div class="resale-hiw-step">
              <div class="resale-hiw-step-num">⚠</div>
              <div class="resale-hiw-step-body">
                <p class="resale-hiw-step-label">VENDA PELO SEU PREÇO</p>
                <p class="resale-hiw-step-text">
                  Você lida com a venda do inicio ao fim, não entregue a chave antes de receber o
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
                  O cliente usa a key na tela de login para criar sua própria conta e ter acesso ao
                  software pelo período contratado.
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

        <!-- Credit cost summary -->
        <div class="resale-cost-row">
          <div class="resale-cost-item">
            <span class="resale-cost-label">CUSTO POR KEY</span>
            <span class="resale-cost-value">
              {{ userStore.resalePlan?.price }}
              <span class="resale-cost-unit">créditos</span>
            </span>
          </div>
          <div class="resale-cost-divider"></div>
          <div class="resale-cost-item">
            <span class="resale-cost-label">DURAÇÃO</span>
            <span class="resale-cost-value">
              {{ userStore.resalePlan?.days }}
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
          ⚠ Créditos insuficientes. Você precisa de {{ userStore.resalePlan?.price }} créditos.
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
        <p style="color: var(--text-secondary); margin-bottom: var(--space-4)">
          Você está prestes a gerar uma key de revenda com plano inicial de
          <strong style="color: var(--text-primary)">{{ userStore.resalePlan?.days }} dias</strong>.
        </p>
        <div class="confirm-row">
          <span class="confirm-label">CRÉDITOS DESCONTADOS</span>
          <span class="confirm-value mono">{{ userStore.resalePlan?.price }} créditos</span>
        </div>
        <div class="modal-policy-box modal-policy-ok">
          <span class="modal-policy-icon">✓</span>
          <p>
            Key <strong>não utilizada</strong> pode ser revertida a qualquer momento, seus créditos
            serão devolvidos integralmente.
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
</template>

<style scoped>
/* Resale plan badge */
.resale-plan-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.rpb-label {
  font-family: var(--font-ui);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  text-transform: uppercase;
}

.rpb-value {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

/* How it works */
.resale-how-it-works {
  background: var(--bg-void);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
  padding: var(--space-5);
}

.resale-hiw-title {
  font-family: var(--font-ui);
  font-size: 0.75rem;
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
