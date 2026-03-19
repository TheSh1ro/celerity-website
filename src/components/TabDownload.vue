<!-- components/TabDownload.vue -->
<template>
  <div class="tab-content space-y-6">
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Download</h2>
        <p class="card-subtitle">Baixe o arquivo e atualizações do aplicativo</p>
      </div>
      <div class="card-body">
        <div v-if="error" class="alert alert-error">
          <span>✕</span>
          <p>{{ error }}</p>
        </div>

        <div class="download-grid" :style="{ opacity: loading ? 0.45 : 1 }">
          <div class="download-card">
            <div class="download-icon">⬇</div>
            <div class="download-info">
              <div class="download-name">
                {{ loading ? '—' : fileName }}
              </div>
              <div class="download-meta">
                {{ loading ? '—' : `v${minVersion} · Portable (não exige instalação)` }}
              </div>
            </div>
            <button
              class="btn btn-primary"
              :disabled="loading || !!error || !executableUrl"
              @click="download"
            >
              {{ loading ? 'CARREGANDO' : 'BAIXAR' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { userRpc } from '@/api'

// ─── State ────────────────────────────────────────────────────────────────────

const loading = ref(true)
const error = ref('')
const executableUrl = ref('')
const minVersion = ref('')

// ─── Computed ─────────────────────────────────────────────────────────────────

const fileName = computed(() => {
  if (!executableUrl.value) return ''
  return executableUrl.value.split('/').pop() ?? executableUrl.value
})

// ─── Actions ──────────────────────────────────────────────────────────────────

async function loadConfig(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const result = await userRpc<{ status: string; config: Record<string, string> }>(
      'get_app_config',
      {},
    )

    if (!result.ok) {
      error.value = result.error
      return
    }

    const config = result.data.config ?? {}
    executableUrl.value = config['executable_url'] ?? ''
    minVersion.value = config['min_version'] ?? ''

    if (!executableUrl.value) {
      error.value = 'URL de download não configurada.'
    }
  } finally {
    loading.value = false
  }
}

function download(): void {
  if (!executableUrl.value) return
  const a = document.createElement('a')
  a.href = executableUrl.value
  a.download = fileName.value
  a.rel = 'noopener noreferrer'
  a.click()
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(loadConfig)
</script>

<style scoped>
.download-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-2);
  transition: opacity 0.2s;
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
