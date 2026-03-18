// stores/admin.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabaseFetch, rpc } from '@/api'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

export interface User {
  id: string
  username: string
  email: string | null
  is_active: boolean
  credits: number
  software_access_until: string | null
  active_token: string | null
  machine_id: string | null
  last_seen: string | null
  created_at: string
}

export interface ResalePlan {
  duration_days: number
  price: number
  is_active: boolean
}

type UserPatch = Partial<Omit<User, 'id' | 'created_at'>>

export const useAdminStore = defineStore('admin', () => {
  // State
  const users = ref<User[]>([])
  const resalePlan = ref<ResalePlan | null>(null)
  const searchQuery = ref('')
  const loading = ref({
    users: false,
    resalePlan: false,
    saveResalePlan: false,
    adjustCredits: false,
    saveUser: false,
  })

  const selectedUser = ref<User | null>(null)
  const showUserPanel = ref(false)

  // Getters
  const filteredUsers = computed(() => {
    const q = searchQuery.value.toLowerCase()
    if (!q) return users.value
    return users.value.filter(
      (u) => u.username.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q),
    )
  })

  const stats = computed(() => ({
    total: users.value.length,
    active: users.value.filter((u) => u.is_active && isLicenseActive(u)).length,
    inactive: users.value.filter((u) => !u.is_active).length,
    expired: users.value.filter((u) => u.is_active && !isLicenseActive(u)).length,
  }))

  // Helpers
  function isLicenseActive(u: User): boolean {
    if (!u.software_access_until) return false
    return new Date(u.software_access_until) > new Date()
  }

  async function getJwt(): Promise<string> {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }

  // Actions
  async function loadUsers() {
    loading.value.users = true
    try {
      const jwt = await getJwt()
      const data = await supabaseFetch('users?select=*&order=created_at.desc', {}, jwt)
      users.value = data as User[]
    } finally {
      loading.value.users = false
    }
  }

  async function loadResalePlan() {
    loading.value.resalePlan = true
    try {
      const jwt = await getJwt()
      const data = await supabaseFetch('resale_plans?duration_days=eq.30', {}, jwt)
      const plans = data as ResalePlan[]
      const first = plans[0]
      if (first !== undefined) {
        resalePlan.value = first
      }
    } finally {
      loading.value.resalePlan = false
    }
  }

  async function saveResalePlan(days: number, price: number, isActive: boolean) {
    loading.value.saveResalePlan = true
    try {
      const jwt = await getJwt()
      const result = await rpc(
        'admin_update_resale_plan',
        {
          p_duration_days: days,
          p_price: price,
          p_is_active: isActive,
        },
        jwt,
      )

      if (result.status === 'ok') {
        await loadResalePlan()
        return { success: true }
      }
      return { success: false, error: result.status }
    } finally {
      loading.value.saveResalePlan = false
    }
  }

  async function adjustCredits(userId: string, amount: number, operation: 'add' | 'remove') {
    loading.value.adjustCredits = true
    try {
      const jwt = await getJwt()
      const result = await rpc(
        'admin_adjust_credits',
        {
          p_user_id: userId,
          p_amount: amount,
          p_operation: operation,
        },
        jwt,
      )

      if (result.status === 'ok') {
        await loadUsers()
        return {
          success: true,
          previous: result.previous_credits,
          new: result.new_credits,
        }
      }
      return { success: false, error: result.status }
    } finally {
      loading.value.adjustCredits = false
    }
  }

  async function updateUser(userId: string, patch: UserPatch) {
    loading.value.saveUser = true
    try {
      const jwt = await getJwt()
      await supabaseFetch(
        `users?id=eq.${userId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        },
        jwt,
      )
      await loadUsers()
      return { success: true }
    } finally {
      loading.value.saveUser = false
    }
  }

  async function forceLogout(userId: string) {
    const jwt = await getJwt()
    await supabaseFetch(
      `users?id=eq.${userId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ active_token: null, machine_id: null }),
      },
      jwt,
    )
    await loadUsers()
  }

  function selectUser(user: User) {
    selectedUser.value = user
    showUserPanel.value = true
  }

  function closeUserPanel() {
    selectedUser.value = null
    showUserPanel.value = false
  }

  return {
    users,
    resalePlan,
    searchQuery,
    loading,
    selectedUser,
    showUserPanel,
    filteredUsers,
    stats,
    isLicenseActive,
    loadUsers,
    loadResalePlan,
    saveResalePlan,
    adjustCredits,
    updateUser,
    forceLogout,
    selectUser,
    closeUserPanel,
  }
})
