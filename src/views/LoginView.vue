<!-- LoginView.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const email = ref('')
const referralCode = ref('')
const isRegistering = ref(false)

async function handleSubmit() {
  const success = await authStore.login(
    username.value,
    password.value,
    isRegistering.value ? referralCode.value : '',
    isRegistering.value ? email.value : '',
  )

  if (!success && authStore.error) {
    // Error is already set in store
  }
}
</script>

<template>
  <div class="login-page">
    <!-- ── Auth Form ──────────────────────────────── -->
    <div class="login-panel">
      <div class="login-inner">
        <!-- Terminal header bar -->
        <div class="terminal-header">
          <span class="terminal-dots"> <span></span><span></span><span></span> </span>
          <span class="terminal-title">
            {{ isRegistering ? 'CRIAR CONTA' : 'AUTENTICAÇÃO' }}
          </span>
        </div>

        <!-- Tab switcher -->
        <div class="auth-tabs">
          <button
            class="auth-tab"
            :class="{ active: !isRegistering }"
            @click="isRegistering = false"
          >
            Entrar
          </button>
          <button class="auth-tab" :class="{ active: isRegistering }" @click="isRegistering = true">
            Criar Conta
          </button>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="auth-form">
          <div class="form-group">
            <label class="form-label">Usuário</label>
            <input
              v-model="username"
              type="text"
              class="form-input"
              placeholder="identificação do operador"
              autocomplete="username"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">Senha</label>
            <input
              v-model="password"
              type="password"
              class="form-input"
              placeholder="••••••••"
              autocomplete="current-password"
              required
            />
          </div>

          <template v-if="isRegistering">
            <div class="form-group">
              <label class="form-label">
                E-mail
                <span class="optional">opcional</span>
              </label>
              <input
                v-model="email"
                type="email"
                class="form-input"
                placeholder="contato@exemplo.com"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Código de Indicação</label>
              <input
                v-model="referralCode"
                type="text"
                class="form-input mono"
                placeholder="Código de quem te indicou"
                spellcheck="false"
                required
              />
            </div>
          </template>

          <!-- Error -->
          <div v-if="authStore.error" class="alert alert-error">
            <span>⚠</span>
            <span>{{ authStore.error }}</span>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            class="btn btn-primary btn-lg w-full submit-btn"
            :disabled="authStore.loading"
          >
            <span class="spinner" v-if="authStore.loading" />
            <template v-else>
              <span class="submit-icon">▶</span>
              <span>{{ isRegistering ? 'CRIAR CONTA' : 'AUTENTICAR' }}</span>
            </template>
          </button>
        </form>

        <!-- Footer links -->
        <div class="auth-footer">
          <span v-if="!isRegistering">
            Sem conta?
            <a href="#" @click.prevent="isRegistering = true">Criar conta</a>
          </span>
          <span v-else>
            Já tem conta?
            <a href="#" @click.prevent="isRegistering = false">Fazer login</a>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Page layout ── */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #090f0b;
  background-image: url('@/assets/login_background.svg');
  background-position: center;
  background-repeat: no-repeat;
  padding: var(--space-8);
}

/* ── Panel ── */
.login-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.login-inner {
  width: 100%;
  max-width: 420px;
}

/* Terminal header decoration */
.terminal-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0.6rem 1rem;
  background: var(--bg-void);
  border: 1px solid var(--wire);
  border-bottom: none;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  margin-bottom: 0;
}

.terminal-dots {
  display: flex;
  gap: 5px;
}

.terminal-dots span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--wire-active);
}

.terminal-dots span:first-child {
  background: var(--red);
}
.terminal-dots span:nth-child(2) {
  background: var(--orange);
}
.terminal-dots span:last-child {
  background: var(--green);
}

.terminal-title {
  font-family: var(--font-ui);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

/* Tabs */
.auth-tabs {
  display: flex;
  background: var(--bg-void);
  border: 1px solid var(--wire);
  border-top: none;
  border-bottom: none;
}

.auth-tab {
  flex: 1;
  padding: 0.65rem 1rem;
  font-family: var(--font-ui);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  border-bottom: 2px solid transparent;
}

.auth-tab:hover {
  color: var(--text-secondary);
}

.auth-tab.active {
  color: var(--amber);
  background: rgba(200, 164, 52, 0.05);
  border-bottom-color: var(--amber);
}

/* Form area */
.auth-form {
  background: var(--bg-void);
  border: 1px solid var(--wire);
  border-top: none;
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

/* Submit button */
.submit-btn {
  margin-top: var(--space-2);
  justify-content: center;
  gap: var(--space-3);
}

.submit-icon {
  font-size: 0.7rem;
  opacity: 0.7;
}

/* Footer */
.auth-footer {
  text-align: center;
  padding: var(--space-4);
  background: var(--bg-void);
  border: 1px solid var(--wire);
  border-top: none;
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  font-size: 0.85rem;
  color: var(--text-muted);
  font-family: var(--font-ui);
  letter-spacing: 0.04em;
}

.auth-footer a {
  color: var(--amber);
  text-decoration: none;
  font-weight: 600;
}

.auth-footer a:hover {
  color: var(--amber-light);
  text-decoration: underline;
}
</style>
