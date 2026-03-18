<!-- components/TabDownload.vue -->
<template>
  <div class="tab-content space-y-6">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Download</h2>
        <p class="card-subtitle">Baixe o arquivo e atualizações do aplicativo</p>
      </div>
      <div class="card-body">
        <div class="alert alert-info">
          <span>◎</span>
          <div>
            <p style="font-weight: 700; font-size: 0.95rem; letter-spacing: 0.06em">EM BREVE</p>
            <p style="font-size: 0.9rem; margin-top: 2px">
              O módulo de downloads está sendo desenvolvido. Em breve você poderá baixar
              atualizações e arquivos diretamente por aqui.
            </p>
          </div>
        </div>

        <div class="download-grid" style="margin-top: var(--space-6); opacity: 0.45">
          <div class="download-card" v-for="item in DOWNLOAD_ITEMS" :key="item.name">
            <div class="download-icon">{{ item.icon }}</div>
            <div class="download-info">
              <div class="download-name">{{ item.name }}</div>
              <div class="download-meta">{{ item.version }} · {{ item.size }}</div>
            </div>
            <button class="btn btn-secondary" disabled>INDISPONÍVEL</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const DOWNLOAD_ITEMS = [
  {
    icon: '⬇',
    name: 'Portable version (não exige instalação)',
    version: 'v1.0.0',
    size: '69.5MB',
  },
]
</script>

<style scoped>
.download-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.download-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  background: var(--bg-elevated);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
  padding: var(--space-4) var(--space-5);
}

.download-icon {
  font-size: 1.25rem;
  opacity: 0.5;
  flex-shrink: 0;
}

.download-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.download-name {
  font-family: var(--font-ui);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.download-meta {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}
</style>
