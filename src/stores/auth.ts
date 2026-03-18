// src/stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { userRpc, type RpcResponse } from '@/api'

export interface UserProfile {
  id: string
  username: string
  email: string | null
  is_admin: boolean
  is_active: boolean
  credits: number
  software_access_until: string | null
}

interface GetUserProfileResponse extends RpcResponse {
  id: string
  username: string
  email: string | null
  is_admin: boolean
  is_active: boolean
  credits: number
  software_access_until: string | null
}

interface WebLoginResponse extends RpcResponse {
  token: string
  software_access_until: string
}

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()

  // ─── State ─────────────────────────────────────────────────────────────────

  const user = ref<UserProfile | null>(null)
  const token = ref<string>(localStorage.getItem('session_token') ?? '')
  const loading = ref(false)
  const error = ref('')

  // ─── Getters ───────────────────────────────────────────────────────────────

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.is_admin ?? false)

  // ─── Actions ───────────────────────────────────────────────────────────────

  function persistToken(newToken: string, accessUntil: string) {
    token.value = newToken
    localStorage.setItem('session_token', newToken)
    localStorage.setItem('software_access_until', accessUntil)
  }

  function clearSession() {
    token.value = ''
    user.value = null
    localStorage.removeItem('session_token')
    localStorage.removeItem('software_access_until')
  }

  function logout() {
    clearSession()
    router.push({ name: 'login' })
  }

  async function activate(
    key: string,
    username: string,
    password: string,
    email?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const result = await userRpc('activate_key', {
      p_key: key.trim(),
      p_username: username.trim(),
      p_password: password,
      p_email: email?.trim() ?? null,
    })

    if (!result.ok) return result
    return { ok: true }
  }

  async function login(
    username: string,
    password: string,
    activationKey?: string,
    email?: string,
  ): Promise<boolean> {
    loading.value = true
    error.value = ''

    try {
      if (activationKey?.trim()) {
        const activation = await activate(activationKey, username, password, email)
        if (!activation.ok) {
          error.value = activation.error!
          return false
        }
      }

      const result = await userRpc<WebLoginResponse>('web_login', {
        p_username: username.trim(),
        p_password: password,
      })

      if (!result.ok) {
        error.value = result.error
        return false
      }

      persistToken(result.data.token, result.data.software_access_until)
      router.replace('/')
      return true
    } finally {
      loading.value = false
    }
  }

  async function loadProfile(): Promise<boolean> {
    if (!token.value) return false

    const result = await userRpc<GetUserProfileResponse>('get_user_profile', {})

    if (!result.ok) return false

    user.value = {
      id: result.data.id,
      username: result.data.username,
      email: result.data.email,
      is_admin: result.data.is_admin,
      is_active: result.data.is_active,
      credits: result.data.credits,
      software_access_until: result.data.software_access_until,
    }

    return true
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    loadProfile,
  }
})
