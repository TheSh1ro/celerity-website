<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const email = ref('')
const referralCode = ref('')
const isRegistering = ref(false)
const showPassword = ref(false)

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
    <div class="login-card">
      <div class="brand">
        <img src="@/assets/logo.png" alt="Warfront" class="brand-logo" />
        <span class="brand-name">CELERITY</span>
      </div>

      <h1 class="mode-title">
        {{ isRegistering ? 'Criar conta' : 'Entrar' }}
      </h1>

      <div class="auth-tabs" role="tablist">
        <button
          role="tab"
          class="auth-tab"
          :class="{ active: !isRegistering }"
          :aria-selected="!isRegistering"
          @click="isRegistering = false"
        >
          Entrar
        </button>
        <button
          role="tab"
          class="auth-tab"
          :class="{ active: isRegistering }"
          :aria-selected="isRegistering"
          @click="isRegistering = true"
        >
          Criar conta
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form" novalidate>
        <div class="field">
          <label class="field-label" for="username">Usuário</label>
          <input
            id="username"
            v-model="username"
            type="text"
            class="form-input"
            placeholder="Identificação de soldado"
            autocomplete="username"
            required
          />
        </div>

        <div class="field">
          <label class="field-label" for="password">Senha</label>
          <div class="input-wrapper">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              placeholder="••••••••"
              autocomplete="current-password"
              required
            />
            <button
              type="button"
              class="toggle-pw"
              :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
              @click="showPassword = !showPassword"
            >
              <span v-if="showPassword">◐</span>
              <span v-else>◑</span>
            </button>
          </div>
        </div>

        <template v-if="isRegistering">
          <div class="field">
            <label class="field-label" for="email">
              E-mail
              <span class="optional-badge">opcional</span>
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              class="form-input"
              placeholder="contato@exemplo.com"
              autocomplete="email"
            />
          </div>

          <div class="field">
            <label class="field-label" for="referral">Código de Indicação</label>
            <input
              id="referral"
              v-model="referralCode"
              type="text"
              class="form-input mono"
              placeholder="INSIRA A KEY"
              spellcheck="false"
              required
            />
          </div>
        </template>

        <div v-if="authStore.error" class="alert-error" role="alert">
          <span class="alert-icon">!</span>
          <span>{{ authStore.error }}</span>
        </div>

        <button type="submit" class="btn-submit" :disabled="authStore.loading">
          <span class="spinner" v-if="authStore.loading" />
          <template v-else>
            {{ isRegistering ? 'Criar conta' : 'Autenticar' }}
          </template>
        </button>
      </form>

      <p class="auth-footer">
        <template v-if="!isRegistering">
          Sem conta?
          <a href="#" @click.prevent="isRegistering = true">Criar conta</a>
        </template>
        <template v-else>
          Já tem conta?
          <a href="#" @click.prevent="isRegistering = false">Fazer login</a>
        </template>
      </p>
    </div>
  </div>
</template>

<style scoped>
/* ── Page ── */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--text-on-accent);
  padding: var(--space-8);
}

/* ── Card ── */
.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-surface);
  border: 1px solid var(--wire-active);
  border-radius: var(--radius-md);
  padding: var(--space-10) var(--space-8);
  box-shadow: var(--shadow-lg);
}

/* ── Brand ── */
.brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-8);
}

.brand-logo {
  height: 36px;
  width: auto;
  display: block;
}

.brand-name {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: 0.22em;
  color: var(--text-secondary);
  text-transform: uppercase;
}

/* ── Mode title ── */
.mode-title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-primary);
  margin-bottom: var(--space-6);
  line-height: 1.1;
}

/* ── Tabs ── */
.auth-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--wire);
  margin-bottom: var(--space-8);
}

.auth-tab {
  flex: 1;
  padding: 0.55rem 0;
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast);
  text-align: left;
}

.auth-tab:hover:not(.active) {
  color: var(--text-secondary);
}

.auth-tab.active {
  color: var(--amber);
  border-bottom-color: var(--amber);
}

/* ── Form ── */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

/* ── Fields ── */
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field-label {
  font-family: var(--font-ui);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.optional-badge {
  font-size: var(--text-2xs);
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0.03em;
  color: var(--text-muted);
  padding: 0.1em 0.45em;
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
}

/* ── Password wrapper ── */
.input-wrapper {
  position: relative;
}

.input-wrapper .form-input {
  padding-right: 2.8rem;
}

.toggle-pw {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: var(--text-base);
  line-height: 1;
  padding: 0;
  transition: color var(--transition-fast);
}

.toggle-pw:hover {
  color: var(--text-secondary);
}

/* ── Submit ── */
.btn-submit {
  width: 100%;
  margin-top: var(--space-2);
  padding: 0.8rem 1.5rem;
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  background: var(--amber);
  color: var(--text-on-accent);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.btn-submit:hover:not(:disabled) {
  background: var(--amber-light);
  box-shadow: var(--amber-glow);
}

.btn-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Error ── */
.alert-error {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--red-dim);
  border: 1px solid var(--red-dim);
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--red);
  line-height: 1.4;
}

.alert-icon {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 700;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 0.05rem;
}

/* ── Footer ── */
.auth-footer {
  margin-top: var(--space-6);
  text-align: center;
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.auth-footer a {
  color: var(--amber);
  text-decoration: none;
  font-weight: 600;
  transition: color var(--transition-fast);
}

.auth-footer a:hover {
  color: var(--amber-light);
  text-decoration: underline;
}

/* ── Spinner ── */
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--wire-active);
  border-top-color: var(--text-on-accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Responsive ── */
@media (max-width: 480px) {
  .login-card {
    padding: var(--space-8) var(--space-6);
  }
}
</style>
