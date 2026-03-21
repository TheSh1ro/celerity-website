<!-- components/TabCredits.vue -->
<template>
  <div class="tab-content space-y-6">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Comprar Créditos</h2>
        <p class="card-subtitle">Adicione créditos à sua conta via Pix</p>
      </div>
      <div class="card-body">
        <div class="alert alert-info">
          <span>◎</span>
          <div>
            <p style="font-weight: 700; font-size: var(--text-base); letter-spacing: 0.06em">
              EM BREVE
            </p>
            <p style="font-size: var(--text-sm); margin-top: 2px">
              A integração com gateway de pagamento está sendo configurada. Entre em contato com o
              administrador para adicionar créditos manualmente. 1 milhão de rublos = 15 créditos,
              ou pagamento via PIX.
            </p>
          </div>
        </div>

        <div class="plan-grid" style="margin-top: var(--space-6); opacity: 0.45">
          <div class="plan-card" v-for="item in CREDIT_PLANS" :key="item.credits">
            <div class="plan-header">
              <h3 class="plan-name">{{ item.credits }} Créditos</h3>
            </div>
            <div class="plan-price">
              <span class="plan-price-value" style="color: var(--text-muted)"
                >R$&thinsp;{{ item.price }}</span
              >
            </div>
            <button class="btn btn-secondary btn-full" disabled>INDISPONÍVEL</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const CREDIT_PLANS = [
  { credits: 10, price: 10 },
  { credits: 20, price: 20 },
  { credits: 30, price: 30 },
  { credits: 100, price: 100 },
]
</script>
