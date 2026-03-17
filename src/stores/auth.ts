// stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { rpc } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()

  // State
  const token = ref<string>(localStorage.getItem('session_token') || '')
  const user = ref<any>(null)
  const loading = ref(false)
  const error = ref('')

  // Getters
  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.is_admin || false)

  // Actions
  async function login(username: string, password: string, activationKey?: string, email?: string) {
    loading.value = true
    error.value = ''

    try {
      // Se tem activationKey, ativa primeiro
      if (activationKey?.trim()) {
        const activateResult = await rpc('activate_key', {
          p_key: activationKey.trim(),
          p_username: username.trim(),
          p_password: password,
          p_email: email?.trim() || null,
        })

        if (activateResult.status !== 'ok') {
          const messages: Record<string, string> = {
            key_not_found: 'Key não encontrada.',
            key_already_used: 'Essa key já foi utilizada.',
            key_reverted: 'Essa key foi cancelada.',
            user_already_exists: 'Esse usuário já existe.',
          }
          error.value = messages[activateResult.status] || `Erro: ${activateResult.status}`
          return false
        }
      }

      // Login
      const loginResult = await rpc('web_login', {
        p_username: username.trim(),
        p_password: password,
      })

      if (loginResult.status === 'ok') {
        token.value = loginResult.token
        localStorage.setItem('session_token', loginResult.token)
        localStorage.setItem('software_access_until', loginResult.software_access_until)
        router.push('/')
        return true
      }

      const messages: Record<string, string> = {
        invalid_credentials: 'Usuário ou senha incorretos.',
        inactive: 'Conta desativada. Entre em contato com o suporte.',
        expired: 'Sua licença expirou.',
        session_sharing: `Conta em uso em outro dispositivo.`,
      }
      error.value = messages[loginResult.status] || `Erro: ${loginResult.status}`
      return false
    } catch (e) {
      error.value = 'Erro de conexão. Tente novamente.'
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('session_token')
    localStorage.removeItem('software_access_until')
    router.push('/')
  }

  async function loadProfile() {
    if (!token.value) return null

    try {
      const result = await rpc('get_user_profile', { p_token: token.value })
      if (result.status === 'ok') {
        user.value = result
        return result
      }
      return null
    } catch (e) {
      return null
    }
  }

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    loadProfile,
  }
})
