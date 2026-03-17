<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
)

// ── Tipos ────────────────────────────────────────────────────────────────────

interface User {
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

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

type EditLicenseOption = 7 | 15 | 30 | 'date' | ''

interface UserPatch {
  is_active: boolean
  software_access_until?: string
  password_hash?: string
}

interface SupabaseError {
  message: string
}

interface ResalePlan {
  duration_days: number
  price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// ── Auth ─────────────────────────────────────────────────────────────────────

const authLoading = ref(true)
const isAdmin = ref(false)
const loginEmail = ref('')
const loginPassword = ref('')
const loginLoading = ref(false)
const loginError = ref('')

async function checkSession() {
  authLoading.value = true
  const { data } = await supabase.auth.getSession()
  const meta = data.session?.user?.app_metadata as Record<string, unknown> | undefined
  isAdmin.value = meta?.is_admin === true
  authLoading.value = false
}

async function adminLogin() {
  loginError.value = ''
  if (!loginEmail.value || !loginPassword.value) {
    loginError.value = 'Preencha e-mail e senha.'
    return
  }
  loginLoading.value = true
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail.value,
      password: loginPassword.value,
    })
    if (error) {
      loginError.value = error.message
      return
    }
    const meta = data.user?.app_metadata as Record<string, unknown> | undefined
    if (meta?.is_admin !== true) {
      await supabase.auth.signOut()
      loginError.value = 'Acesso negado. Conta sem permissão de admin.'
      return
    }
    isAdmin.value = true
    await loadUsers()
  } finally {
    loginLoading.value = false
  }
}

async function logout() {
  await supabase.auth.signOut()
  isAdmin.value = false
  loginEmail.value = ''
  loginPassword.value = ''
}

// ── Estado ───────────────────────────────────────────────────────────────────

const users = ref<User[]>([])
const loading = ref(false)
const search = ref('')
const toasts = ref<Toast[]>([])
let toastId = 0

const showEdit = ref(false)
const showConfirm = ref(false)
const showKeyModal = ref(false)
const showCreditsModal = ref(false)

const generatingKey = ref(false)
const lastGeneratedKey = ref<string | null>(null)

const editId = ref('')
const editUsername = ref('')
const editPassword = ref('')
const editLicenseDays = ref<EditLicenseOption>('')
const editCustomDate = ref('')
const editIsActive = ref(true)
const editLoading = ref(false)

// Credits modal
const creditsUserId = ref('')
const creditsUsername = ref('')
const creditsCurrentAmount = ref(0)
const creditsOperation = ref<'add' | 'remove'>('add')
const creditsAmount = ref('')
const creditsLoading = ref(false)

const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmSub = ref('')
const confirmDanger = ref(false)
const confirmLoading = ref(false)
let pendingAction: (() => Promise<void>) | null = null

// Resale plan
const resalePlan = ref<ResalePlan | null>(null)
const loadingResalePlan = ref(false)
const showResalePlanModal = ref(false)
const resalePlanDays = ref(30)
const resalePlanPrice = ref('')
const resalePlanActive = ref(true)
const resalePlanLoading = ref(false)

// ── Computed ─────────────────────────────────────────────────────────────────

const filteredUsers = computed(() => {
  const q = search.value.toLowerCase()
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function isLicenseActive(u: User): boolean {
  if (!u.software_access_until) return false
  return new Date(u.software_access_until) > new Date()
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function daysLeft(iso: string | null): string {
  if (!iso) return '—'
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  return diff <= 0 ? 'expirado' : `${diff}d`
}

function addToast(message: string, type: Toast['type'] = 'info') {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 3200)
}

function isSupabaseError(value: unknown): value is SupabaseError {
  return typeof value === 'object' && value !== null && 'message' in value
}

function getErrorMessage(e: unknown): string {
  if (isSupabaseError(e)) return e.message
  if (e instanceof Error) return e.message
  return 'Erro desconhecido.'
}

// ── API ──────────────────────────────────────────────────────────────────────

async function getJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ''
}

async function sbFetch(path: string, opts: RequestInit = {}): Promise<unknown> {
  const jwt = await getJwt()
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL as string}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${jwt}`,
      Prefer: 'return=representation',
      ...(opts.headers ?? {}),
    },
  })
  if (!res.ok) {
    const err: unknown = await res.json().catch(() => ({}))
    throw new Error(isSupabaseError(err) ? err.message : `HTTP ${res.status}`)
  }
  const text = await res.text()
  return text ? (JSON.parse(text) as unknown) : null
}

async function loadUsers() {
  loading.value = true
  try {
    const data = await sbFetch('users?select=*&order=created_at.desc')
    users.value = data as User[]
  } catch (e) {
    addToast('Erro ao carregar usuários: ' + getErrorMessage(e), 'error')
  } finally {
    loading.value = false
  }
}

// ── Gerar key ────────────────────────────────────────────────────────────────

async function adminGenerateKey() {
  generatingKey.value = true
  try {
    const jwt = await getJwt()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL as string}/rest/v1/rpc/admin_generate_key`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({}),
      },
    )
    const result = (await res.json()) as { status: string; key?: string }
    if (result.status === 'ok' && result.key) {
      lastGeneratedKey.value = result.key
      showKeyModal.value = true
    } else {
      addToast(`Erro: ${result.status}`, 'error')
    }
  } catch (e) {
    addToast('Erro: ' + getErrorMessage(e), 'error')
  } finally {
    generatingKey.value = false
  }
}

function copyGeneratedKey() {
  if (!lastGeneratedKey.value) return
  navigator.clipboard.writeText(lastGeneratedKey.value)
  addToast('Key copiada!', 'info')
}

// ── Ajustar créditos ─────────────────────────────────────────────────────────

function openCreditsModal(u: User) {
  creditsUserId.value = u.id
  creditsUsername.value = u.username
  creditsCurrentAmount.value = u.credits
  creditsOperation.value = 'add'
  creditsAmount.value = ''
  showCreditsModal.value = true
}

async function saveCredits() {
  const amount = parseFloat(creditsAmount.value)

  if (!creditsAmount.value || isNaN(amount) || amount <= 0) {
    addToast('Informe um valor válido maior que zero', 'error')
    return
  }

  creditsLoading.value = true
  try {
    const jwt = await getJwt()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL as string}/rest/v1/rpc/admin_adjust_credits`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          p_user_id: creditsUserId.value,
          p_amount: amount,
          p_operation: creditsOperation.value,
        }),
      },
    )
    const result = (await res.json()) as {
      status: string
      username?: string
      previous_credits?: number
      new_credits?: number
    }

    if (result.status === 'ok') {
      const op = creditsOperation.value === 'add' ? 'adicionados' : 'removidos'
      addToast(
        `${amount} créditos ${op} para ${result.username}. Saldo: ${result.previous_credits} → ${result.new_credits}`,
        'success',
      )
      showCreditsModal.value = false
      await loadUsers()
    } else if (result.status === 'insufficient_credits') {
      addToast('Créditos insuficientes para remover este valor', 'error')
    } else if (result.status === 'user_not_found') {
      addToast('Usuário não encontrado', 'error')
    } else {
      addToast(`Erro: ${result.status}`, 'error')
    }
  } catch (e) {
    addToast('Erro ao ajustar créditos: ' + getErrorMessage(e), 'error')
  } finally {
    creditsLoading.value = false
  }
}

// ── Editar ───────────────────────────────────────────────────────────────────

function openEdit(u: User) {
  editId.value = u.id
  editUsername.value = u.username
  editPassword.value = ''
  editLicenseDays.value = ''
  editCustomDate.value = ''
  editIsActive.value = u.is_active
  showEdit.value = true
}

async function saveEdit() {
  editLoading.value = true
  try {
    const patch: UserPatch = { is_active: editIsActive.value }

    if (editPassword.value) {
      patch.password_hash = editPassword.value
    }

    if (editLicenseDays.value === 'date' && editCustomDate.value) {
      patch.software_access_until = new Date(editCustomDate.value).toISOString()
    } else if (typeof editLicenseDays.value === 'number') {
      const days = editLicenseDays.value
      patch.software_access_until = new Date(Date.now() + days * 86400000).toISOString()
    }

    await sbFetch(`users?id=eq.${editId.value}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })

    addToast('Usuário atualizado!', 'success')
    showEdit.value = false
    await loadUsers()
  } catch (e) {
    addToast('Erro ao salvar: ' + getErrorMessage(e), 'error')
  } finally {
    editLoading.value = false
  }
}

// ── Logout forçado ───────────────────────────────────────────────────────────

function confirmForceLogout(u: User) {
  confirmTitle.value = 'Forçar logout'
  confirmMessage.value = `Desconectar ${u.username}?`
  confirmSub.value = 'O usuário precisará fazer login novamente.'
  confirmDanger.value = false
  showConfirm.value = true
  pendingAction = async () => {
    await sbFetch(`users?id=eq.${u.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active_token: null, machine_id: null }),
    })
    addToast(`${u.username} desconectado.`, 'success')
    await loadUsers()
  }
}

// ── Deletar ──────────────────────────────────────────────────────────────────

function confirmDelete(u: User) {
  confirmTitle.value = 'Deletar usuário'
  confirmMessage.value = `Deletar ${u.username}?`
  confirmSub.value = 'Esta ação não pode ser desfeita.'
  confirmDanger.value = true
  showConfirm.value = true
  pendingAction = async () => {
    await sbFetch(`users?id=eq.${u.id}`, { method: 'DELETE' })
    addToast(`${u.username} deletado.`, 'success')
    await loadUsers()
  }
}

// ── Plano de Revenda ─────────────────────────────────────────────────────────

async function loadResalePlan() {
  loadingResalePlan.value = true
  try {
    const data = await sbFetch('resale_plans?duration_days=eq.30')
    const plans = data as ResalePlan[]
    if (plans.length > 0) {
      resalePlan.value = plans[0]!
    }
  } catch (e) {
    addToast('Erro ao carregar plano de revenda: ' + getErrorMessage(e), 'error')
  } finally {
    loadingResalePlan.value = false
  }
}

function openResalePlanModal() {
  if (resalePlan.value) {
    resalePlanDays.value = resalePlan.value.duration_days
    resalePlanPrice.value = resalePlan.value.price.toString()
    resalePlanActive.value = resalePlan.value.is_active
  } else {
    resalePlanDays.value = 30
    resalePlanPrice.value = '20'
    resalePlanActive.value = true
  }
  showResalePlanModal.value = true
}

async function saveResalePlan() {
  const price = parseFloat(resalePlanPrice.value)

  if (!resalePlanPrice.value || isNaN(price) || price < 0) {
    addToast('Informe um preço válido', 'error')
    return
  }

  resalePlanLoading.value = true
  try {
    const jwt = await getJwt()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL as string}/rest/v1/rpc/admin_update_resale_plan`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          p_duration_days: resalePlanDays.value,
          p_price: price,
          p_is_active: resalePlanActive.value,
        }),
      },
    )
    const result = (await res.json()) as {
      status: string
      days?: number
      price?: number
      is_active?: boolean
    }

    if (result.status === 'ok') {
      addToast('Plano de revenda atualizado!', 'success')
      showResalePlanModal.value = false
      await loadResalePlan()
    } else {
      addToast(`Erro: ${result.status}`, 'error')
    }
  } catch (e) {
    addToast('Erro ao salvar plano: ' + getErrorMessage(e), 'error')
  } finally {
    resalePlanLoading.value = false
  }
}

async function runConfirm() {
  if (!pendingAction) return
  confirmLoading.value = true
  try {
    await pendingAction()
    showConfirm.value = false
  } catch (e) {
    addToast('Erro: ' + getErrorMessage(e), 'error')
  } finally {
    confirmLoading.value = false
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  await checkSession()
  if (isAdmin.value) {
    await Promise.all([loadUsers(), loadResalePlan()])
  }
})
</script>

<template>
  <!-- LOGIN SCREEN -->
  <div class="login-page" v-if="!authLoading && !isAdmin">
    <div class="card login-card">
      <div class="section-label">ADMIN LOGIN</div>
      <div class="flex flex-col gap-3">
        <input
          class="input"
          v-model="loginEmail"
          type="email"
          placeholder="E-mail"
          @keyup.enter="adminLogin"
        />
        <input
          class="input"
          v-model="loginPassword"
          type="password"
          placeholder="Senha"
          @keyup.enter="adminLogin"
        />
        <span class="error" v-if="loginError">{{ loginError }}</span>
      </div>
      <button class="btn btn-primary" :disabled="loginLoading" @click="adminLogin">
        <span class="spinner" v-if="loginLoading" />
        <span v-else>ENTRAR</span>
      </button>
    </div>
  </div>

  <!-- LOADING -->
  <div class="loading-page" v-else-if="authLoading">
    <span class="spinner" />
  </div>

  <!-- DASHBOARD -->
  <template v-else>
    <header class="header">
      <div class="flex items-center justify-between">
        <span class="section-label">ADMIN</span>
        <button class="btn btn-ghost btn-sm" @click="logout">SAIR</button>
      </div>
    </header>

    <!-- PLANO DE REVENDA -->
    <section class="resale-plan-section" v-if="!loadingResalePlan && resalePlan">
      <div class="resale-plan-card">
        <div class="flex items-center justify-between">
          <div>
            <div class="section-label" style="margin-bottom: var(--space-2)">
              PLANO DE REVENDA ATIVO
            </div>
            <div class="resale-info">
              <span class="resale-days">{{ resalePlan.duration_days }}<span>d</span></span>
              <span class="resale-separator">·</span>
              <span class="resale-price">{{ resalePlan.price }} créditos</span>
              <span class="resale-separator">·</span>
              <span :class="resalePlan.is_active ? 'badge badge-green' : 'badge badge-muted'">
                {{ resalePlan.is_active ? 'Ativo' : 'Desativado' }}
              </span>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" @click="openResalePlanModal">EDITAR</button>
        </div>
      </div>
    </section>

    <main class="page-content">
      <!-- STATS -->
      <div class="flex gap-4 wrap" style="margin-bottom: var(--space-6)">
        <div class="stat-card">
          <div class="stat-label">Total</div>
          <div class="stat-value">{{ stats.total }}</div>
        </div>
        <div class="stat-card green">
          <div class="stat-label">Ativos</div>
          <div class="stat-value">{{ stats.active }}</div>
        </div>
        <div class="stat-card red">
          <div class="stat-label">Expirados</div>
          <div class="stat-value">{{ stats.expired }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Desativados</div>
          <div class="stat-value">{{ stats.inactive }}</div>
        </div>
      </div>

      <!-- TOP BAR -->
      <div
        class="flex items-center justify-between wrap gap-4"
        style="margin-bottom: var(--space-4)"
      >
        <div class="section-label">USUÁRIOS</div>
        <div class="flex gap-3">
          <input
            class="input search-input"
            v-model="search"
            placeholder="Buscar usuário ou e-mail…"
          />
          <button
            class="btn btn-primary btn-sm"
            :disabled="generatingKey"
            @click="adminGenerateKey"
          >
            <span class="spinner" v-if="generatingKey" />
            <span v-else>+ GERAR KEY</span>
          </button>
          <button class="btn btn-ghost btn-sm" @click="loadUsers">↺ ATUALIZAR</button>
        </div>
      </div>

      <!-- TABELA -->
      <div class="table-wrap">
        <div class="loading-row" v-if="loading"><span class="spinner" /> Carregando…</div>
        <table v-else>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>E-mail</th>
              <th>Status</th>
              <th>Licença até</th>
              <th>Dias</th>
              <th>Créditos</th>
              <th>Último acesso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredUsers.length === 0">
              <td colspan="8" class="empty-row">Nenhum usuário encontrado.</td>
            </tr>
            <tr v-for="u in filteredUsers" :key="u.id">
              <td class="mono">{{ u.username }}</td>
              <td>{{ u.email ?? '—' }}</td>
              <td>
                <span v-if="!u.is_active" class="badge badge-muted">Inativo</span>
                <span v-else-if="isLicenseActive(u)" class="badge badge-green">Ativo</span>
                <span v-else class="badge badge-red">Expirado</span>
              </td>
              <td class="mono">{{ formatDate(u.software_access_until) }}</td>
              <td class="mono">{{ daysLeft(u.software_access_until) }}</td>
              <td class="mono">{{ u.credits }}</td>
              <td>{{ formatDate(u.last_seen) }}</td>
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-ghost btn-sm" @click="openEdit(u)">EDITAR</button>
                  <button class="btn btn-ghost btn-sm" @click="openCreditsModal(u)">
                    CRÉDITOS
                  </button>
                  <button
                    class="btn btn-ghost btn-sm"
                    @click="confirmForceLogout(u)"
                    :disabled="!u.active_token"
                  >
                    LOGOUT
                  </button>
                  <button class="btn btn-danger btn-sm" @click="confirmDelete(u)">✕</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- MODAL: KEY GERADA -->
    <div class="overlay" v-if="showKeyModal" @click.self="showKeyModal = false">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Key gerada</span>
          <button class="btn btn-ghost btn-sm" @click="showKeyModal = false">✕</button>
        </div>
        <div class="flex flex-col gap-3">
          <span style="color: var(--muted); font-size: var(--text-sm)"
            >30 dias · copie antes de fechar</span
          >
          <div class="key-display">
            <span class="mono">{{ lastGeneratedKey }}</span>
            <button class="btn btn-ghost btn-sm" @click="copyGeneratedKey">⎘ COPIAR</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="showKeyModal = false">FECHAR</button>
        </div>
      </div>
    </div>

    <!-- MODAL: AJUSTAR CRÉDITOS -->
    <div class="overlay" v-if="showCreditsModal" @click.self="showCreditsModal = false">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Ajustar créditos — {{ creditsUsername }}</span>
          <button class="btn btn-ghost btn-sm" @click="showCreditsModal = false">✕</button>
        </div>
        <div class="flex flex-col gap-4">
          <div class="field">
            <label>SALDO ATUAL</label>
            <div class="credits-display">{{ creditsCurrentAmount }} créditos</div>
          </div>
          <div class="field">
            <label>OPERAÇÃO</label>
            <div class="flex gap-3">
              <label class="radio-label">
                <input type="radio" v-model="creditsOperation" value="add" />
                Adicionar
              </label>
              <label class="radio-label">
                <input type="radio" v-model="creditsOperation" value="remove" />
                Remover
              </label>
            </div>
          </div>
          <div class="field">
            <label>VALOR</label>
            <input
              class="input"
              v-model="creditsAmount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Quantidade de créditos"
              @keyup.enter="saveCredits"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showCreditsModal = false">Cancelar</button>
          <button class="btn btn-primary" :disabled="creditsLoading" @click="saveCredits">
            <span class="spinner" v-if="creditsLoading" />
            <span v-else>{{ creditsOperation === 'add' ? 'Adicionar' : 'Remover' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: EDITAR -->
    <div class="overlay" v-if="showEdit" @click.self="showEdit = false">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Editar — {{ editUsername }}</span>
          <button class="btn btn-ghost btn-sm" @click="showEdit = false">✕</button>
        </div>
        <div class="flex flex-col gap-4">
          <div class="field">
            <label>NOVA SENHA <span class="optional">OPCIONAL</span></label>
            <input
              class="input"
              v-model="editPassword"
              type="password"
              placeholder="Deixe vazio para não alterar"
            />
          </div>
          <div class="field">
            <label>ESTENDER LICENÇA <span class="optional">OPCIONAL</span></label>
            <select class="input" v-model="editLicenseDays">
              <option value="">Não alterar</option>
              <option :value="7">+ 7 dias a partir de hoje</option>
              <option :value="15">+ 15 dias a partir de hoje</option>
              <option :value="30">+ 30 dias a partir de hoje</option>
              <option value="date">Data específica</option>
            </select>
          </div>
          <div class="field" v-if="editLicenseDays === 'date'">
            <label>DATA DE EXPIRAÇÃO</label>
            <input class="input" v-model="editCustomDate" type="date" />
          </div>
          <div class="field">
            <label><input type="checkbox" v-model="editIsActive" /> Conta ativa</label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showEdit = false">Cancelar</button>
          <button class="btn btn-primary" :disabled="editLoading" @click="saveEdit">
            <span class="spinner" v-if="editLoading" />
            <span v-else>Salvar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: EDITAR PLANO DE REVENDA -->
    <div class="overlay" v-if="showResalePlanModal" @click.self="showResalePlanModal = false">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Configurar Plano de Revenda</span>
          <button class="btn btn-ghost btn-sm" @click="showResalePlanModal = false">✕</button>
        </div>
        <div class="flex flex-col gap-4">
          <div class="field">
            <label>DURAÇÃO (DIAS)</label>
            <select class="input" v-model.number="resalePlanDays">
              <option :value="7">7 dias</option>
              <option :value="15">15 dias</option>
              <option :value="30">30 dias</option>
            </select>
          </div>
          <div class="field">
            <label>PREÇO (CRÉDITOS)</label>
            <input
              class="input"
              v-model="resalePlanPrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="Preço em créditos"
              @keyup.enter="saveResalePlan"
            />
            <span class="field-hint">
              Quanto o usuário paga para gerar uma key de {{ resalePlanDays }} dias
            </span>
          </div>
          <div class="field">
            <label>
              <input type="checkbox" v-model="resalePlanActive" />
              Plano ativo (usuários podem gerar keys)
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showResalePlanModal = false">Cancelar</button>
          <button class="btn btn-primary" :disabled="resalePlanLoading" @click="saveResalePlan">
            <span class="spinner" v-if="resalePlanLoading" />
            <span v-else>Salvar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: CONFIRMAÇÃO -->
    <div class="overlay" v-if="showConfirm" @click.self="showConfirm = false">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">{{ confirmTitle }}</span>
        </div>
        <div class="flex flex-col gap-2">
          <span>{{ confirmMessage }}</span>
          <span style="color: var(--muted); font-size: var(--text-sm)">{{ confirmSub }}</span>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showConfirm = false">Cancelar</button>
          <button
            :class="confirmDanger ? 'btn btn-danger' : 'btn btn-ghost'"
            :disabled="confirmLoading"
            @click="runConfirm"
          >
            <span class="spinner" v-if="confirmLoading" />
            <span v-else>Confirmar</span>
          </button>
        </div>
      </div>
    </div>
  </template>

  <!-- TOASTS -->
  <div class="toast-container">
    <div v-for="t in toasts" :key="t.id" :class="`toast toast-${t.type}`">
      <span>{{ t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ' }}</span>
      {{ t.message }}
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
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-8);
}

.loading-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-input {
  width: 260px;
}

.loading-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6) var(--space-5);
  color: var(--muted);
  font-size: var(--text-sm);
  font-family: var(--font-mono);
}

.empty-row {
  color: var(--muted);
  font-size: var(--text-sm);
  text-align: center;
  padding: var(--space-8);
}

.key-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-3) var(--space-4);
}

.credits-display {
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  color: var(--primary);
  padding: var(--space-3);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.radio-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  font-size: var(--text-sm);
}

.radio-label input[type='radio'] {
  cursor: pointer;
}

.resale-plan-section {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-6);
  margin: var(--space-6) var(--space-6) 0;
}

.resale-plan-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.resale-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.resale-days {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--primary);
}

.resale-days span {
  font-size: 1rem;
  color: var(--muted);
}

.resale-price {
  font-size: var(--text-base);
  font-family: var(--font-mono);
  color: var(--fg);
}

.resale-separator {
  color: var(--muted);
}

.field-hint {
  display: block;
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  color: var(--muted);
}
</style>
