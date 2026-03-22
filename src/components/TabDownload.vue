<!-- components/TabDownload.vue -->
<template>
  <div class="tab-content space-y-6">
    <!-- ─── Sobre o aplicativo ────────────────────────────────────────────────────── -->
    <div class="card card--highlight">
      <div class="card-header">
        <h2 class="card-title">Sobre o aplicativo</h2>
        <p class="card-subtitle">O que é o CELERITY</p>
      </div>

      <div class="card-body">
        <p class="card-text">
          O <strong>CELERITY</strong> é um aplicativo focado em automação de tarefas repetitivas.
        </p>

        <ul class="feature-list" style="margin-top: var(--space-3)">
          <li>
            <span class="feature-dot"></span>
            Cliques contínuos (<code>mouse1</code>)
          </li>
          <li>
            <span class="feature-dot"></span>
            Arrastar itens entre coordenadas
            <code>[x1,y1]</code> → <code>[x2,y2]</code>
          </li>
          <li>
            <span class="feature-dot"></span>
            Execução de macros interativos
          </li>
        </ul>

        <div class="alert alert-info" style="margin-top: var(--space-3)">
          <span>ℹ</span>
          <p>
            CELERITY é um macro: o aplicativo não altera o jogo, apenas executa ações simulando
            interação do usuário.
          </p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Download</h2>
        <p class="card-subtitle">Baixe o arquivo e atualizações do aplicativo</p>
      </div>
      <div class="card-body">
        <div v-if="userStore.appConfigError" class="alert alert-error">
          <span>✕</span>
          <p>{{ userStore.appConfigError }}</p>
        </div>

        <div class="download-grid" :style="{ opacity: userStore.loading.appConfig ? 0.45 : 1 }">
          <div class="download-card">
            <div class="download-icon">⬇</div>
            <div class="download-info">
              <div class="download-name">
                {{ userStore.loading.appConfig ? '—' : fileName }}
              </div>
              <div class="download-meta">
                {{
                  userStore.loading.appConfig
                    ? '—'
                    : `v${userStore.appConfig?.minVersion} · Portable (não exige instalação)`
                }}
              </div>
            </div>
            <button
              class="btn btn-primary"
              :disabled="
                userStore.loading.appConfig ||
                !!userStore.appConfigError ||
                !userStore.appConfig?.executableUrl
              "
              @click="download"
            >
              {{ userStore.loading.appConfig ? 'CARREGANDO' : 'BAIXAR' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Tutorial accordion ──────────────────────────────────────────────── -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Como usar o aplicativo</h2>
        <p class="card-subtitle">Guia de cada seção das configurações</p>
      </div>
      <div class="card-body">
        <div class="accordion">
          <div
            v-for="(section, index) in tutorialSections"
            :key="section.id"
            class="accordion-item"
            :class="{ 'accordion-item--open': openSection === section.id }"
          >
            <button class="accordion-trigger" @click="toggleSection(section.id)">
              <span class="accordion-trigger-left">
                <span class="accordion-index">{{ String(index + 1).padStart(2, '0') }}.</span>
                <span class="accordion-title">{{ section.title }}</span>
              </span>
              <span class="accordion-chevron">▸</span>
            </button>

            <Transition name="accordion">
              <div v-if="openSection === section.id" class="accordion-body">
                <div class="tutorial-content">
                  <div class="tutorial-screenshot">
                    <img
                      :src="section.image"
                      :alt="`Screenshot da aba ${section.title}`"
                      class="screenshot-img"
                    />
                  </div>
                  <p class="tutorial-intro">{{ section.intro }}</p>
                  <ul class="tutorial-items">
                    <li v-for="item in section.items" :key="item.label" class="tutorial-item">
                      <span class="tutorial-item-label">{{ item.label }}</span>
                      <span class="tutorial-item-desc">{{ item.desc }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Revert steps ────────────────────────────────────────────────────── -->
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
              Cole o link abaixo na barra de URL e pressione <kbd>Buscar</kbd>:
              <div class="command-box">
                <code class="command-text" style="color: var(--amber-light)"
                  >https://www.youtube.com/watch?v=Aq5WXmQQooo</code
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
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// ─── State ────────────────────────────────────────────────────────────────────

const copySuccess = ref(false)
const openSection = ref<string | null>(null)

// ─── Tutorial data ─────────────────────────────────────────────────────────────

const tutorialSections = [
  {
    id: 'tela',
    title: 'TELA',
    image: new URL('@/assets/tutorial/1.png', import.meta.url).href,
    intro: 'Define as regiões da tela que o aplicativo utiliza para operar.',
    items: [
      {
        label: 'Combinar item → DEFINIR',
        desc: 'Clique e selecione a coordenada exata onde o item deve ser arrastado para combinar (ex.: pedra de amolar).',
      },
      {
        label: 'Inventário → DEFINIR',
        desc: 'Clique e desenhe a área do inventário onde as pedras de amolar ficam localizadas na tela.',
      },
      {
        label: 'MOSTRAR ÁREAS',
        desc: 'Exibe um overlay visual com todas as áreas definidas para confirmar o posicionamento.',
      },
    ],
  },
  {
    id: 'item-move',
    title: 'ITEM MOVE',
    image: new URL('@/assets/tutorial/2.png', import.meta.url).href,
    intro: 'Configura as posições de origem e destino para mover itens automaticamente.',
    items: [
      {
        label: 'Posição 1 → DEFINIR',
        desc: 'Define a coordenada de origem do drag (ponto de onde o item será pego).',
      },
      {
        label: 'Posição 1 → atalho',
        desc: 'Associa uma tecla de atalho para ativar rapidamente esta posição.',
      },
      {
        label: 'Posição 2 → DEFINIR',
        desc: 'Define a coordenada de destino do drag (ponto onde o item será solto).',
      },
      {
        label: 'Posição 2 → atalho',
        desc: 'Associa uma tecla de atalho para ativar rapidamente esta posição.',
      },
      {
        label: 'MOSTRAR POSIÇÕES',
        desc: 'Exibe um overlay visual indicando as posições 1 e 2 configuradas.',
      },
    ],
  },
  {
    id: 'recon',
    title: 'RECON',
    image: new URL('@/assets/tutorial/3.png', import.meta.url).href,
    intro: 'Gerencia as imagens de referência usadas para reconhecimento de itens na tela.',
    items: [
      {
        label: 'Threshold de detecção',
        desc: 'Controla a sensibilidade do reconhecimento (0.0 a 1.0). Valores mais altos exigem correspondência mais precisa com o template.',
      },
      {
        label: 'Amolador horizontal → VER',
        desc: 'Abre uma prévia da imagem de referência atual para o amolador na posição horizontal.',
      },
      {
        label: 'Amolador horizontal → DEFINIR',
        desc: 'Permite capturar uma nova imagem de referência para o amolador horizontal.',
      },
      {
        label: 'Amolador vertical → VER',
        desc: 'Abre uma prévia da imagem de referência atual para o amolador na posição vertical.',
      },
      {
        label: 'Amolador vertical → DEFINIR',
        desc: 'Permite capturar uma nova imagem de referência para o amolador vertical.',
      },
      {
        label: 'TESTAR DETECÇÃO',
        desc: 'Executa o reconhecimento em tempo real para validar se os templates estão sendo detectados corretamente.',
      },
    ],
  },
  {
    id: 'hotkeys',
    title: 'HOTKEYS',
    image: new URL('@/assets/tutorial/4.png', import.meta.url).href,
    intro:
      'Configura os atalhos de teclado globais do aplicativo. Pressione Delete para remover, ESC para cancelar.',
    items: [
      {
        label: 'Modo acima',
        desc: 'Cicla para o modo anterior na lista. Padrão: Page Up.',
      },
      {
        label: 'Modo abaixo',
        desc: 'Cicla para o próximo modo na lista. Padrão: Page Down.',
      },
      {
        label: 'Toggle overlay',
        desc: 'Mostra ou oculta o overlay sem interromper o modo atual. Padrão: F1.',
      },
      {
        label: 'Iniciar / Parar',
        desc: 'Inicia ou para o modo ativo no momento. Padrão: 0.',
      },
    ],
  },
  {
    id: 'conta',
    title: 'CONTA',
    image: new URL('@/assets/tutorial/5.png', import.meta.url).href,
    intro: 'Informações da licença e opções de gerenciamento da conta.',
    items: [
      {
        label: 'Licença',
        desc: 'Exibe o status e validade da sua licença atual, incluindo a data de expiração.',
      },
      {
        label: 'LOGOUT',
        desc: 'Remove a sessão local e reinicia o aplicativo. Use para trocar de conta.',
      },
      {
        label: 'Modo disfarce → ATIVAR',
        desc: 'Transforma o aplicativo em um conversor de youtube para mp3. Atenção: será necessário seguir as instruções abaixo para reverter.',
      },
    ],
  },
]

// ─── Computed ─────────────────────────────────────────────────────────────────

const fileName = computed(() => {
  const url = userStore.appConfig?.executableUrl
  if (!url) return ''
  return url.split('/').pop() ?? url
})

// ─── Actions ──────────────────────────────────────────────────────────────────

function toggleSection(id: string): void {
  openSection.value = openSection.value === id ? null : id
}

function download(): void {
  const url = userStore.appConfig?.executableUrl
  if (!url) return
  const a = document.createElement('a')
  a.href = url
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

onMounted(() => {
  if (!userStore.appConfig) {
    userStore.loadAppConfig()
  }
})
</script>

<style scoped>
/* ─── Info card ─────────────────────────────────────────────────────────── */
.card--highlight {
  border: 1px solid var(--amber);
}

.card-text {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.6;
}

.feature-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.feature-dot {
  width: 6px;
  height: 6px;
  background: var(--amber);
  border-radius: 50%;
  flex-shrink: 0;
}

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
  font-size: var(--text-xl);
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
  font-size: var(--text-base);
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.download-meta {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
  letter-spacing: 0.04em;
}

/* ─── Accordion ─────────────────────────────────────────────────────────────── */

.accordion {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: var(--space-2);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.accordion-item {
  border-bottom: 1px solid var(--wire);
}

.accordion-item:last-child {
  border-bottom: none;
}

.accordion-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--amber);
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

/* .accordion-trigger:hover {
}

.accordion-item--open .accordion-trigger {
} */

.accordion-trigger-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.accordion-index {
  font-family: var(--font-mono);
  font-size: var(--text-base);
  color: var(--text-on-accent);
  letter-spacing: 0.08em;
  flex-shrink: 0;
}

.accordion-title {
  font-family: var(--font-ui);
  font-size: var(--text-base);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-on-accent);
}

/* .accordion-item--open .accordion-title {
} */

.accordion-chevron {
  font-size: var(--text-2xs);
  color: var(--text-muted);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.accordion-item--open .accordion-chevron {
  transform: rotate(90deg);
  color: var(--amber);
}

.accordion-body {
  background: var(--bg-base);
  border-top: 1px solid var(--wire);
  overflow: hidden;
}

/* ─── Accordion transition ──────────────────────────────────────────────────── */

.accordion-enter-active,
.accordion-leave-active {
  transition:
    max-height 0.25s ease,
    opacity 0.2s ease;
  max-height: 600px;
}

.accordion-enter-from,
.accordion-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ─── Tutorial content ──────────────────────────────────────────────────────── */

.tutorial-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
}

.tutorial-screenshot {
  overflow-x: auto;
}

.screenshot-img {
  display: block;
  max-width: none;
  height: auto;
  border-radius: var(--radius-sm);
  border: 1px solid var(--wire);
  background: var(--bg-elevated);
}

.tutorial-intro {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0;
}

.tutorial-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-2);
}

.tutorial-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-elevated);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
}

.tutorial-item-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--amber);
}

.tutorial-item-desc {
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.45;
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
  background: var(--amber-light);
  color: var(--text-on-accent);
  font-size: var(--text-xs);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-content {
  flex: 1;
  font-size: var(--text-sm);
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
  font-size: var(--text-xs);
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
  font-size: var(--text-xs);
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
  font-size: var(--text-sm);
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
  color: var(--green-light);
  border-color: var(--green-light);
}
</style>
