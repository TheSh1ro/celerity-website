// stores/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { rpc } from '@/api'
import { useAuthStore } from './auth'

export interface Key {
  id: string
  key: string
  duration_days: number
  price: number
  created_at: string
  used: boolean
  used_at: string | null
  reverted: boolean
  reverted_at: string | null
}

export interface ResalePlan {
  days: number
  price: number
  is_active: boolean
}

export const useUserStore = defineStore('user', () => {
  const authStore = useAuthStore()

  // State
  const profile = computed(() => authStore.user)
  const keys = ref<Key[]>([])
  const resalePlan = ref<ResalePlan | null>(null)
  const plans = ref([
    { days: 7, price: 10 },
    { days: 15, price: 20 },
    { days: 30, price: 30 },
  ])

  const loading = ref({
    keys: false,
    resalePlan: false,
    generateKey: false,
    revertKey: null as string | null,
    buyDays: null as number | null,
  })

  // Getters
  const daysLeft = computed(() => {
    if (!profile.value?.software_access_until) return 0
    return Math.max(
      0,
      Math.ceil((new Date(profile.value.software_access_until).getTime() - Date.now()) / 86400000),
    )
  })

  const isExpired = computed(() => daysLeft.value === 0)

  const keyStats = computed(() => ({
    total: keys.value.length,
    used: keys.value.filter((k) => k.used).length,
    available: keys.value.filter((k) => !k.used && !k.reverted).length,
    reverted: keys.value.filter((k) => k.reverted).length,
  }))

  // Actions
  async function loadKeys() {
    if (!authStore.token) return

    loading.value.keys = true
    try {
      const result = await rpc('get_user_keys', { p_token: authStore.token })
      if (result.status === 'ok') {
        keys.value = (result.keys as Key[]) || []
      }
    } finally {
      loading.value.keys = false
    }
  }

  async function loadResalePlan() {
    loading.value.resalePlan = true
    try {
      const result = await rpc('get_active_resale_plan', {})
      if (result.status === 'ok') {
        resalePlan.value = {
          days: result.days as number,
          price: result.price as number,
          is_active: true,
        }
      }
    } finally {
      loading.value.resalePlan = false
    }
  }

  async function generateKey() {
    if (!resalePlan.value || !authStore.token) return { success: false }

    loading.value.generateKey = true
    try {
      const result = await rpc('generate_key', { p_token: authStore.token })

      if (result.status === 'ok') {
        await Promise.all([authStore.loadProfile(), loadKeys()])
        return { success: true, key: result.key as string }
      }

      const messages: Record<string, string> = {
        session_invalid: 'Sessão inválida.',
        inactive: 'Conta desativada.',
        insufficient_credits: 'Créditos insuficientes.',
        no_resale_plan: 'Plano de revenda não configurado.',
      }
      return { success: false, error: messages[result.status] || result.status }
    } finally {
      loading.value.generateKey = false
    }
  }

  async function revertKey(keyId: string) {
    if (!authStore.token) return { success: false }

    loading.value.revertKey = keyId
    try {
      const result = await rpc('revert_key', {
        p_token: authStore.token,
        p_key_id: keyId,
      })

      if (result.status === 'ok') {
        await Promise.all([authStore.loadProfile(), loadKeys()])
        return { success: true }
      }

      const messages: Record<string, string> = {
        session_invalid: 'Sessão inválida.',
        key_not_found: 'Key não encontrada.',
        forbidden: 'Sem permissão.',
        key_already_used: 'Key já foi utilizada.',
        key_already_reverted: 'Key já foi revertida.',
      }
      return { success: false, error: messages[result.status] || result.status }
    } finally {
      loading.value.revertKey = null
    }
  }

  async function buyDays(durationDays: number) {
    if (!authStore.token) return { success: false }

    loading.value.buyDays = durationDays
    try {
      const result = await rpc('buy_days', {
        p_token: authStore.token,
        p_duration_days: durationDays,
      })

      if (result.status === 'ok') {
        await authStore.loadProfile()
        return {
          success: true,
          message:
            result.days_ago === 0
              ? `Licença ativada por ${durationDays} dias!`
              : `Licença estendida em ${durationDays} dias!`,
        }
      }

      const messages: Record<string, string> = {
        session_invalid: 'Sessão inválida.',
        plan_not_found: 'Plano não encontrado.',
        insufficient_credits: 'Créditos insuficientes.',
      }
      return { success: false, error: messages[result.status] || result.status }
    } finally {
      loading.value.buyDays = null
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key)
  }

  return {
    profile,
    keys,
    resalePlan,
    plans,
    loading,
    daysLeft,
    isExpired,
    keyStats,
    loadKeys,
    loadResalePlan,
    generateKey,
    revertKey,
    buyDays,
    copyKey,
  }
})
