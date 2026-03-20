<!-- components/TabTransactions.vue -->
<script setup lang="ts">
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

function isCredit(amount: number) {
  return amount > 0
}

function formatDateTime(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="tab-content space-y-6">
    <div class="card">
      <div class="card-header">
        <div class="card-header-inner">
          <div>
            <h2 class="card-title">Histórico de Transações</h2>
            <p class="card-subtitle">Registro de movimentações de créditos da sua conta</p>
          </div>
          <button
            class="btn btn-ghost"
            :disabled="userStore.loading.transactions"
            style="margin-top: var(--space-4)"
            @click="userStore.loadTransactions()"
          >
            <span class="spinner" v-if="userStore.loading.transactions" />
            <span v-else>↺ Atualizar</span>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="userStore.loading.transactions" class="empty-state">
        <span class="spinner" style="width: 22px; height: 22px" />
        <p style="margin-top: var(--space-3)">Carregando transações...</p>
      </div>

      <!-- Empty -->
      <div v-else-if="userStore.transactions.length === 0" class="empty-state">
        <div class="empty-state-icon">◈</div>
        <p>Nenhuma transação registrada</p>
        <p style="font-size: var(--text-sm); margin-top: var(--space-1)">
          As movimentações de crédito aparecerão aqui
        </p>
      </div>

      <!-- Table -->
      <div v-else class="card-body" style="padding: 0">
        <table>
          <thead>
            <tr>
              <th style="width: 44px"></th>
              <th>Descrição</th>
              <th>Data</th>
              <th style="text-align: right">Créditos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in userStore.transactions" :key="tx.id">
              <td>
                <div
                  class="tx-icon"
                  :class="isCredit(tx.amount) ? 'tx-icon--credit' : 'tx-icon--debit'"
                >
                  {{ isCredit(tx.amount) ? '↑' : '↓' }}
                </div>
              </td>
              <td>
                <div class="tx-label">{{ tx.label }}</div>
              </td>
              <td class="mono" style="font-size: var(--text-xs); color: var(--text-muted)">
                {{ formatDateTime(tx.created_at) }}
              </td>
              <td style="text-align: right">
                <span
                  class="tx-amount"
                  :class="isCredit(tx.amount) ? 'tx-amount--credit' : 'tx-amount--debit'"
                >
                  {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Legend -->
    <div class="tx-legend">
      <div class="tx-legend-item">
        <span class="tx-icon tx-icon--credit" style="width: 22px; height: 22px; font-size: var(--text-2xs)"
          >↑</span
        >
        <span>Entrada de créditos</span>
      </div>
      <div class="tx-legend-item">
        <span class="tx-icon tx-icon--debit" style="width: 22px; height: 22px; font-size: var(--text-2xs)"
          >↓</span
        >
        <span>Saída de créditos</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tx-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: var(--text-xs);
  font-weight: 700;
  flex-shrink: 0;
}

.tx-icon--credit {
  background: var(--green-dim);
  border: 1px solid rgba(58, 170, 82, 0.3);
  color: var(--green-light);
}

.tx-icon--debit {
  background: var(--red-dim);
  border: 1px solid rgba(224, 68, 68, 0.25);
  color: var(--red);
}

.tx-label {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.3;
}

.tx-description {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-top: 2px;
  line-height: 1.3;
}

.tx-amount {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.tx-amount--credit {
  color: var(--green-light);
}
.tx-amount--debit {
  color: var(--red);
}

.tx-balance {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.tx-legend {
  display: flex;
  gap: var(--space-5);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-surface);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
}

.tx-legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
