<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const username = ref('')
const password = ref('')
const email = ref('')
const activationKey = ref('')
const loading = ref(false)
const errorMsg = ref('')

const isActivation = computed(() => activationKey.value.trim().length > 0)

async function rpc(fn: string, body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function handleSubmit() {
  errorMsg.value = ''

  if (!username.value.trim() || !password.value) {
    errorMsg.value = 'Usuário e senha são obrigatórios.'
    return
  }

  loading.value = true

  try {
    if (isActivation.value) {
      const activateResult = await rpc('activate_key', {
        p_key: activationKey.value.trim(),
        p_username: username.value.trim(),
        p_password: password.value,
        p_email: email.value.trim() || null,
      })

      if (activateResult.status !== 'ok') {
        const messages: Record<string, string> = {
          key_not_found: 'Key não encontrada.',
          key_already_used: 'Essa key já foi utilizada.',
          key_reverted: 'Essa key foi cancelada.',
          user_already_exists: 'Esse usuário já existe.',
        }
        errorMsg.value = messages[activateResult.status] ?? `Erro: ${activateResult.status}`
        return
      }
    }

    const loginResult = await rpc('web_login', {
      p_username: username.value.trim(),
      p_password: password.value,
    })

    if (loginResult.status === 'ok') {
      localStorage.setItem('session_token', loginResult.token)
      localStorage.setItem('software_access_until', loginResult.software_access_until)
      router.push('/user')
      return
    }

    const messages: Record<string, string> = {
      invalid_credentials: 'Usuário ou senha incorretos.',
      inactive: 'Conta desativada. Entre em contato com o suporte.',
      expired: 'Sua licença expirou.',
      session_sharing: `Conta em uso em outro dispositivo há ${loginResult.days_ago}d. Tente em ${(7 - loginResult.days_ago).toFixed(1)} dias.`,
    }
    errorMsg.value = messages[loginResult.status] ?? `Erro: ${loginResult.status}`
  } catch {
    errorMsg.value = 'Erro de conexão. Tente novamente.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card card">
      <div class="logo">
        <div class="logo-icon">⬡</div>
        <span>DAYZ<span>BOT</span></span>
      </div>

      <div class="section-label">{{ isActivation ? 'CRIAR CONTA' : 'ACESSO' }}</div>

      <div class="flex flex-col gap-4">
        <div class="field">
          <label>USUÁRIO</label>
          <input
            class="input"
            v-model="username"
            type="text"
            autocomplete="username"
            :disabled="loading"
            @keyup.enter="handleSubmit"
          />
        </div>

        <div class="field">
          <label>SENHA</label>
          <input
            class="input"
            v-model="password"
            type="password"
            autocomplete="current-password"
            :disabled="loading"
            @keyup.enter="handleSubmit"
          />
        </div>

        <div class="field" v-if="isActivation">
          <label>E-MAIL <span class="optional">OPCIONAL</span></label>
          <input
            class="input"
            v-model="email"
            type="email"
            autocomplete="email"
            :disabled="loading"
          />
        </div>

        <div class="field">
          <label>KEY DE ATIVAÇÃO <span class="optional">OPCIONAL</span></label>
          <input
            class="input mono-input"
            v-model="activationKey"
            type="text"
            placeholder="Deixe vazio para apenas logar"
            :disabled="loading"
          />
        </div>

        <div class="alert alert-error" v-if="errorMsg"><span>✕</span> {{ errorMsg }}</div>

        <button class="btn btn-primary btn-full" :disabled="loading" @click="handleSubmit">
          <span class="spinner" v-if="loading" />
          <span v-else>{{ isActivation ? 'CRIAR CONTA E ENTRAR' : 'ENTRAR' }}</span>
        </button>
      </div>

      <div class="login-hint" v-if="!isActivation">
        Novo usuário? Insira sua key de ativação acima.
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.login-card {
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-8);
}

.login-hint {
  font-size: var(--text-sm);
  color: var(--muted);
  text-align: center;
}
</style>
