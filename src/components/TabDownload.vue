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

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Como reverter o modo disfarce</h2>
        <p class="card-subtitle">Siga os passos abaixo</p>
      </div>
      <div class="card-body">
        <div class="revert-steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              Pressione <kbd>⊞ Win</kbd> + <kbd>R</kbd> no teclado para abrir o
              <strong>Executar</strong>.
            </div>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              Cole o comando abaixo no campo e pressione <kbd>Enter</kbd>:
              <div class="command-box">
                <code class="command-text"
                  >reg add "HKCU\Software\ytb-mp3" /v alternative_mode /t REG_DWORD /d 0 /f</code
                >
                <button
                  class="btn-copy"
                  :class="{ copied: copySuccess }"
                  :title="copySuccess ? 'Copiado!' : 'Copiar'"
                  @click="copyCommand"
                >
                  <span v-if="!copySuccess">⧉</span>
                  <span v-else>✓</span>
                </button>
              </div>
            </div>
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
const copySuccess = ref(false)

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

function copyCommand(): void {
  navigator.clipboard.writeText(
    'reg add "HKCU\\Software\\ytb-mp3" /v alternative_mode /t REG_DWORD /d 0 /f',
  )
  copySuccess.value = true
  setTimeout(() => (copySuccess.value = false), 2000)
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(loadConfig)
</script>

<style scoped>
/* ─── Download card ─────────────────────────────────────────────────────────── */

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

/* ─── Revert steps ──────────────────────────────────────────────────────────── */

.revert-steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-2);
}

.step {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.step-number {
  flex-shrink: 0;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  background: var(--color-primary, #6c63ff);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-content {
  flex: 1;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

kbd {
  display: inline-block;
  padding: 1px 6px;
  border: 1px solid var(--wire);
  border-radius: 4px;
  background: var(--bg-elevated);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-primary);
}

.command-box {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
  background: var(--bg-elevated);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
}

.command-text {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--text-muted);
  word-break: break-all;
}

.btn-copy {
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-muted);
  transition:
    color 0.2s,
    border-color 0.2s;
}

.btn-copy:hover {
  color: var(--text-primary);
  border-color: var(--text-muted);
}

.btn-copy.copied {
  color: #4caf50;
  border-color: #4caf50;
}
</style>
