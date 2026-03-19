// src/stores/admin.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { adminRpc, adminFetch, supabase } from '@/api'

// ─── Tipos ────────────────────────────────────────────────────────────────────

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

export interface UserKey {
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
  duration_days: number
  price: number
  is_active: boolean
}

export interface LicensePlan {
  duration_days: number
  price: number
}

type UserPatch = Partial<Omit<User, 'id' | 'created_at'>>

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAdminStore = defineStore('admin', () => {
  // ─── State ─────────────────────────────────────────────────────────────────

  const users = ref<User[]>([])
  const selectedUserKeys = ref<UserKey[]>([])
  const resalePlans = ref<ResalePlan[]>([])
  const licensePlans = ref<LicensePlan[]>([])
  const searchQuery = ref('')
  const selectedUser = ref<User | null>(null)
  const showUserPanel = ref(false)

  const loading = ref({
    users: false,
    resalePlans: false,
    licensePlans: false,
    saveResalePlan: false,
    saveLicensePlan: false,
    adjustCredits: false,
    saveUser: false,
    auth: false,
    userKeys: false,
  })

  const error = ref('')

  // ─── Supabase Auth (painel interno) ────────────────────────────────────────

  const supabaseAuthed = ref(false)

  supabase.auth.getSession().then(({ data }) => {
    supabaseAuthed.value = !!data.session
  })

  supabase.auth.onAuthStateChange((_event, session) => {
    supabaseAuthed.value = !!session
  })

  async function login(email: string, password: string): Promise<boolean> {
    loading.value.auth = true
    error.value = ''

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        error.value = 'Credenciais inválidas.'
        return false
      }
      return true
    } finally {
      loading.value.auth = false
    }
  }

  async function logout(): Promise<void> {
    await supabase.auth.signOut()
  }

  // ─── Getters ───────────────────────────────────────────────────────────────

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

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function isLicenseActive(u: User): boolean {
    if (!u.software_access_until) return false
    return new Date(u.software_access_until) > new Date()
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async function loadUsers(): Promise<void> {
    loading.value.users = true
    try {
      const data = await adminFetch('users?select=*&order=created_at.desc')
      users.value = data as User[]
    } finally {
      loading.value.users = false
    }
  }

  async function loadResalePlans(): Promise<void> {
    loading.value.resalePlans = true
    try {
      const data = await adminFetch('resale_plans?order=duration_days.asc')
      resalePlans.value = data as ResalePlan[]
    } finally {
      loading.value.resalePlans = false
    }
  }

  async function loadLicensePlans(): Promise<void> {
    loading.value.licensePlans = true
    try {
      const data = await adminFetch('plans?order=duration_days.asc')
      licensePlans.value = data as LicensePlan[]
    } finally {
      loading.value.licensePlans = false
    }
  }

  async function loadUserKeys(userId: string): Promise<void> {
    loading.value.userKeys = true
    selectedUserKeys.value = []
    try {
      const result = await adminRpc<{ status: string; keys: UserKey[] }>('admin_get_user_keys', {
        p_user_id: userId,
      })
      if (result.ok) selectedUserKeys.value = result.data.keys ?? []
    } finally {
      loading.value.userKeys = false
    }
  }

  async function saveResalePlan(
    days: number,
    price: number,
    isActive: boolean,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    loading.value.saveResalePlan = true
    try {
      const result = await adminRpc('admin_update_resale_plan', {
        p_duration_days: days,
        p_price: price,
        p_is_active: isActive,
      })

      if (!result.ok) return result

      await loadResalePlans()
      return { ok: true }
    } finally {
      loading.value.saveResalePlan = false
    }
  }

  async function saveLicensePlan(
    days: number,
    price: number,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    loading.value.saveLicensePlan = true
    try {
      const result = await adminRpc('admin_update_plan', {
        p_duration_days: days,
        p_price: price,
      })

      if (!result.ok) return result

      await loadLicensePlans()
      return { ok: true }
    } finally {
      loading.value.saveLicensePlan = false
    }
  }

  async function adjustCredits(
    userId: string,
    amount: number,
    operation: 'add' | 'remove',
  ): Promise<{ ok: true; previous: number; new: number } | { ok: false; error: string }> {
    loading.value.adjustCredits = true
    try {
      const result = await adminRpc<{
        status: string
        previous_credits: number
        new_credits: number
      }>('admin_adjust_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_operation: operation,
      })

      if (!result.ok) return result

      await loadUsers()
      return {
        ok: true,
        previous: result.data.previous_credits,
        new: result.data.new_credits,
      }
    } finally {
      loading.value.adjustCredits = false
    }
  }

  async function updateUser(
    userId: string,
    patch: UserPatch,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    loading.value.saveUser = true
    try {
      await adminFetch(`users?id=eq.${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      await loadUsers()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Erro inesperado.' }
    } finally {
      loading.value.saveUser = false
    }
  }

  async function forceLogout(userId: string): Promise<void> {
    await adminFetch(`users?id=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ active_token: null, machine_id: null }),
    })
    await loadUsers()
  }

  function selectUser(user: User): void {
    selectedUser.value = user
    showUserPanel.value = true
    loadUserKeys(user.id)
  }

  function closeUserPanel(): void {
    selectedUser.value = null
    selectedUserKeys.value = []
    showUserPanel.value = false
  }

  return {
    users,
    selectedUserKeys,
    resalePlans,
    licensePlans,
    searchQuery,
    loading,
    error,
    selectedUser,
    showUserPanel,
    supabaseAuthed,
    filteredUsers,
    stats,
    isLicenseActive,
    login,
    logout,
    loadUsers,
    loadResalePlans,
    loadLicensePlans,
    loadUserKeys,
    saveResalePlan,
    saveLicensePlan,
    adjustCredits,
    updateUser,
    forceLogout,
    selectUser,
    closeUserPanel,
  }
})
