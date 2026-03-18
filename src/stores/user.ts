// src/stores/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userRpc } from '@/api'
import { useAuthStore } from './auth'

// ─── Tipos ────────────────────────────────────────────────────────────────────

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

export interface LicensePlan {
  days: number
  price: number
}

export interface Transaction {
  id: string
  type:
    | 'admin_credit_add'
    | 'admin_credit_remove'
    | 'pix_payment'
    | 'key_revert'
    | 'key_generate'
    | 'key_purchase'
    | 'license_extension'
    | 'key_activation'
    | string
  amount: number
  reference_id: string
  label: string
  created_at: string
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUserStore = defineStore('user', () => {
  const authStore = useAuthStore()

  // ─── State ─────────────────────────────────────────────────────────────────

  const keys = ref<Key[]>([])
  const resalePlan = ref<ResalePlan | null>(null)
  const licensePlans = ref<LicensePlan[]>([])
  const transactions = ref<Transaction[]>([])

  const loading = ref({
    keys: false,
    resalePlan: false,
    licensePlans: false,
    transactions: false,
    generateKey: false,
    revertKey: null as string | null,
    buyDays: null as number | null,
  })

  // ─── Getters ───────────────────────────────────────────────────────────────

  const profile = computed(() => authStore.user)

  const daysLeft = computed(() => {
    if (!profile.value?.software_access_until) return 0
    return Math.max(
      0,
      Math.ceil(
        (new Date(profile.value.software_access_until).getTime() - Date.now()) / 86_400_000,
      ),
    )
  })

  const isExpired = computed(() => daysLeft.value === 0)

  const keyStats = computed(() => ({
    total: keys.value.length,
    used: keys.value.filter((k) => k.used).length,
    available: keys.value.filter((k) => !k.used && !k.reverted).length,
    reverted: keys.value.filter((k) => k.reverted).length,
  }))

  // ─── Actions ───────────────────────────────────────────────────────────────

  async function loadKeys(): Promise<void> {
    loading.value.keys = true
    try {
      const result = await userRpc<{ status: string; keys: Key[] }>('get_user_keys', {})
      if (result.ok) keys.value = result.data.keys ?? []
    } finally {
      loading.value.keys = false
    }
  }

  async function loadResalePlan(): Promise<void> {
    loading.value.resalePlan = true
    try {
      const result = await userRpc<{
        status: string
        days: number
        price: number
      }>('get_active_resale_plan', {}, false)

      if (result.ok) {
        resalePlan.value = {
          days: result.data.days,
          price: result.data.price,
          is_active: true,
        }
      }
    } finally {
      loading.value.resalePlan = false
    }
  }

  async function loadLicensePlans(): Promise<void> {
    loading.value.licensePlans = true
    try {
      const result = await userRpc<{ status: string; plans: LicensePlan[] }>(
        'get_license_plans',
        {},
        false,
      )
      if (result.ok) licensePlans.value = result.data.plans ?? []
    } finally {
      loading.value.licensePlans = false
    }
  }

  async function loadTransactions(): Promise<void> {
    loading.value.transactions = true
    try {
      const result = await userRpc<{ status: string; transactions: Transaction[] }>(
        'get_user_transactions',
        {},
      )
      if (result.ok) transactions.value = result.data.transactions ?? []
    } finally {
      loading.value.transactions = false
    }
  }

  async function generateKey(): Promise<{ ok: true; key: string } | { ok: false; error: string }> {
    loading.value.generateKey = true
    try {
      const result = await userRpc<{ status: string; key: string }>('generate_key', {})

      if (!result.ok) return result

      await Promise.all([authStore.loadProfile(), loadKeys()])
      return { ok: true, key: result.data.key }
    } finally {
      loading.value.generateKey = false
    }
  }

  async function revertKey(keyId: string): Promise<{ ok: true } | { ok: false; error: string }> {
    loading.value.revertKey = keyId
    try {
      const result = await userRpc('revert_key', { p_key_id: keyId })

      if (!result.ok) return result

      await Promise.all([authStore.loadProfile(), loadKeys()])
      return { ok: true }
    } finally {
      loading.value.revertKey = null
    }
  }

  async function buyDays(
    durationDays: number,
  ): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
    loading.value.buyDays = durationDays
    try {
      const result = await userRpc<{ status: string; days_ago: number }>('buy_days', {
        p_duration_days: durationDays,
      })

      if (!result.ok) return result

      await authStore.loadProfile()

      const message =
        result.data.days_ago === 0
          ? `Licença ativada por ${durationDays} dias!`
          : `Licença estendida em ${durationDays} dias!`

      return { ok: true, message }
    } finally {
      loading.value.buyDays = null
    }
  }

  function copyKey(key: string): void {
    navigator.clipboard.writeText(key)
  }

  return {
    keys,
    resalePlan,
    licensePlans,
    transactions,
    loading,
    profile,
    daysLeft,
    isExpired,
    keyStats,
    loadKeys,
    loadResalePlan,
    loadLicensePlans,
    loadTransactions,
    generateKey,
    revertKey,
    buyDays,
    copyKey,
  }
})
