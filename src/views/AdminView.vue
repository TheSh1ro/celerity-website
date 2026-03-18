<!-- AdminView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { useAdminStore, type User } from '@/stores/admin'
import { useToastStore } from '@/stores/toast'
import { useUserStore } from '@/stores/user'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

const adminStore = useAdminStore()
const toastStore = useToastStore()
const userStore = useUserStore()

const authLoading = ref(true)
const isAdmin = ref(false)
const loginEmail = ref('')
const loginPassword = ref('')
const loginLoading = ref(false)
const loginError = ref('')

const showResaleModal = ref(false)
const showCreditsModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const showLogoutModal = ref(false)

const resaleForm = ref({ days: 30, price: 20, is_active: true })
const creditsForm = ref({
  userId: '',
  username: '',
  current: 0,
  amount: '',
  operation: 'add' as 'add' | 'remove',
})
const editForm = ref({
  id: '',
  username: '',
  password: '',
  licenseDays: '' as '' | number | 'date',
  customDate: '',
  isActive: true,
})

onMounted(async () => {
  await checkSession()
})

async function checkSession() {
  authLoading.value = true
  const { data } = await supabase.auth.getSession()
  isAdmin.value = data.session?.user?.app_metadata?.['is_admin'] === true
  authLoading.value = false

  if (isAdmin.value) {
    await Promise.all([adminStore.loadUsers(), adminStore.loadResalePlan()])
    if (adminStore.resalePlan) {
      resaleForm.value = {
        days: adminStore.resalePlan.duration_days,
        price: adminStore.resalePlan.price,
        is_active: adminStore.resalePlan.is_active,
      }
    }
  }
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

    if (data.user?.app_metadata?.['is_admin'] !== true) {
      await supabase.auth.signOut()
      loginError.value = 'Acesso negado. Conta sem permissão de admin.'
      return
    }

    isAdmin.value = true
    await Promise.all([adminStore.loadUsers(), adminStore.loadResalePlan()])
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

async function saveResalePlan() {
  const result = await adminStore.saveResalePlan(
    resaleForm.value.days,
    resaleForm.value.price,
    resaleForm.value.is_active,
  )

  if (result.success) {
    toastStore.success('Plano de revenda atualizado!')
    showResaleModal.value = false
  } else {
    toastStore.error(result.error || 'Erro ao salvar plano')
  }
}

function openCreditsModal(user: User) {
  creditsForm.value = {
    userId: user.id,
    username: user.username,
    current: user.credits,
    amount: '',
    operation: 'add',
  }
  showCreditsModal.value = true
}

async function saveCredits() {
  const amount = parseFloat(creditsForm.value.amount)
  if (!amount || amount <= 0) {
    toastStore.error('Informe um valor válido')
    return
  }

  const result = await adminStore.adjustCredits(
    creditsForm.value.userId,
    amount,
    creditsForm.value.operation,
  )

  if (result.success) {
    toastStore.success(
      `${amount} créditos ${creditsForm.value.operation === 'add' ? 'adicionados' : 'removidos'} para ${creditsForm.value.username}`,
    )
    showCreditsModal.value = false
  } else {
    toastStore.error(result.error || 'Erro ao ajustar créditos')
  }
}

function openEditModal(user: User) {
  editForm.value = {
    id: user.id,
    username: user.username,
    password: '',
    licenseDays: '',
    customDate: '',
    isActive: user.is_active,
  }
  showEditModal.value = true
}

async function saveEdit() {
  type EditPatch = {
    is_active: boolean
    password_hash?: string
    software_access_until?: string
  }
  const patch: EditPatch = { is_active: editForm.value.isActive }

  if (editForm.value.password) {
    patch.password_hash = editForm.value.password
  }

  if (editForm.value.licenseDays === 'date' && editForm.value.customDate) {
    patch.software_access_until = new Date(editForm.value.customDate).toISOString()
  } else if (typeof editForm.value.licenseDays === 'number') {
    patch.software_access_until = new Date(
      Date.now() + editForm.value.licenseDays * 86400000,
    ).toISOString()
  }

  const result = await adminStore.updateUser(editForm.value.id, patch)

  if (result.success) {
    toastStore.success('Usuário atualizado!')
    showEditModal.value = false
  }
}

function openDeleteModal(user: User) {
  adminStore.selectUser(user)
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!adminStore.selectedUser) return
  await adminStore.updateUser(adminStore.selectedUser.id, { is_active: false })
  toastStore.success('Usuário desativado')
  showDeleteModal.value = false
  adminStore.closeUserPanel()
}

function openLogoutModal(user: User) {
  adminStore.selectUser(user)
  showLogoutModal.value = true
}

async function confirmLogout() {
  if (!adminStore.selectedUser) return
  await adminStore.forceLogout(adminStore.selectedUser.id)
  toastStore.success('Usuário desconectado')
  showLogoutModal.value = false
}

async function expandUser(user: User) {
  adminStore.selectUser(user)
  await userStore.loadKeys()
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function daysLeft(iso: string | null) {
  if (!iso) return '—'
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  return diff <= 0 ? 'expirado' : `${diff}d`
}
</script>

<template>
  <!-- ── ADMIN LOGIN ──────────────────────────────────────────── -->
  <div class="admin-login-page" v-if="!authLoading && !isAdmin">
    <div class="admin-login-wrap">
      <div class="admin-login-brand">
        <div class="admin-logo">◈</div>
        <div>
          <h1 class="admin-brand-title">DayZ Bot</h1>
          <p class="admin-brand-sub">PAINEL DE CONTROLE // ACESSO RESTRITO</p>
        </div>
      </div>

      <div class="admin-login-card">
        <!-- Terminal header -->
        <div class="terminal-header">
          <span class="terminal-dots"> <span></span><span></span><span></span> </span>
          <span class="terminal-title">AUTENTICAÇÃO ADMINISTRATIVA</span>
        </div>

        <div
          v-if="loginError"
          class="alert alert-error"
          style="margin: var(--space-5); margin-bottom: 0"
        >
          <span>⚠</span> {{ loginError }}
        </div>

        <form @submit.prevent="adminLogin" class="admin-login-form">
          <div class="form-group">
            <label class="form-label">E-mail</label>
            <input
              v-model="loginEmail"
              type="email"
              class="form-input"
              placeholder="admin@exemplo.com"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">Senha</label>
            <input
              v-model="loginPassword"
              type="password"
              class="form-input"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" class="btn btn-primary btn-lg w-full" :disabled="loginLoading">
            <span class="spinner" v-if="loginLoading" />
            <span v-else>▶ ACESSAR PAINEL</span>
          </button>
        </form>
      </div>
    </div>
  </div>

  <!-- ── LOADING ── -->
  <div v-else-if="authLoading" class="loading-page">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem">
      <span class="spinner" style="width: 32px; height: 32px" />
      <p
        style="
          font-family: var(--font-ui);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: var(--text-muted);
        "
      >
        VERIFICANDO CREDENCIAIS
      </p>
    </div>
  </div>

  <!-- ── ADMIN DASHBOARD ──────────────────────────────────────── -->
  <div class="admin-dashboard-page" v-else>
    <header class="app-header">
      <div class="container header-content">
        <div class="logo">
          <div class="logo-icon">◈</div>
          <span>DayZ Bot</span>
          <span class="admin-badge">ADMIN</span>
        </div>
        <button class="btn btn-ghost btn-sm" @click="logout">⏻ Sair</button>
      </div>
    </header>

    <main class="container admin-main">
      <!-- ── Stats ── -->
      <div class="stats-grid" style="margin-bottom: var(--space-6)">
        <div class="stat-card">
          <div class="stat-label">Operadores</div>
          <div class="stat-value">{{ adminStore.stats.total }}</div>
        </div>
        <div class="stat-card success">
          <div class="stat-label">Licenças Ativas</div>
          <div class="stat-value" style="color: var(--green)">{{ adminStore.stats.active }}</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-label">Expirados</div>
          <div class="stat-value" style="color: var(--orange)">{{ adminStore.stats.expired }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Desativados</div>
          <div class="stat-value" style="color: var(--text-muted)">
            {{ adminStore.stats.inactive }}
          </div>
        </div>
      </div>

      <!-- ── Resale Plan Config ── -->
      <div class="card" style="margin-bottom: var(--space-6)">
        <div class="card-header">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="section-card-title">Plano de Revenda</h2>
              <p class="section-card-sub">Configurações globais para revendedores</p>
            </div>
            <button class="btn btn-secondary btn-sm" @click="showResaleModal = true">
              ⚙ Configurar
            </button>
          </div>
        </div>
        <div class="card-body" v-if="adminStore.resalePlan">
          <div class="resale-config-row">
            <div class="rci">
              <span class="rci-label">DURAÇÃO</span>
              <span class="rci-value"
                >{{ adminStore.resalePlan.duration_days }} <small>dias</small></span
              >
            </div>
            <div class="rci-divider"></div>
            <div class="rci">
              <span class="rci-label">PREÇO</span>
              <span class="rci-value"
                >{{ adminStore.resalePlan.price }} <small>créditos</small></span
              >
            </div>
            <div class="rci-divider"></div>
            <div class="rci">
              <span class="rci-label">STATUS</span>
              <span
                :class="[
                  'badge',
                  adminStore.resalePlan.is_active ? 'badge-success' : 'badge-neutral',
                ]"
              >
                {{ adminStore.resalePlan.is_active ? 'Ativo' : 'Desativado' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Users Table ── -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between" style="gap: var(--space-4)">
            <h2 class="section-card-title">Operadores Registrados</h2>
            <div class="flex gap-3">
              <input
                v-model="adminStore.searchQuery"
                type="text"
                class="form-input"
                placeholder="Buscar operador ou e-mail..."
                style="width: 260px"
              />
              <button
                class="btn btn-secondary btn-sm"
                @click="adminStore.loadUsers"
                :disabled="adminStore.loading.users"
              >
                <span class="spinner" v-if="adminStore.loading.users" />
                <span v-else>↻ Atualizar</span>
              </button>
            </div>
          </div>
        </div>

        <div class="card-body" style="padding: 0">
          <div v-if="adminStore.loading.users" class="empty-state">
            <span class="spinner" />
            <p>Carregando operadores...</p>
          </div>

          <table v-else>
            <thead>
              <tr>
                <th>Operador</th>
                <th>E-mail</th>
                <th>Status</th>
                <th>Licença</th>
                <th>Dias</th>
                <th>Créditos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="adminStore.filteredUsers.length === 0">
                <td colspan="7" class="empty-state" style="padding: 3rem">
                  Nenhum operador encontrado.
                </td>
              </tr>

              <template v-for="user in adminStore.filteredUsers" :key="user.id">
                <tr class="user-row" @click="expandUser(user)">
                  <td>
                    <span class="mono" style="font-weight: 600; color: var(--text-primary)">
                      {{ user.username }}
                    </span>
                  </td>
                  <td style="color: var(--text-muted)">{{ user.email || '—' }}</td>
                  <td>
                    <span v-if="!user.is_active" class="badge badge-neutral">Inativo</span>
                    <span v-else-if="adminStore.isLicenseActive(user)" class="badge badge-success"
                      >Ativo</span
                    >
                    <span v-else class="badge badge-warning">Expirado</span>
                  </td>
                  <td class="mono" style="font-size: 0.82rem">
                    {{ formatDate(user.software_access_until) }}
                  </td>
                  <td class="mono" style="font-size: 0.82rem">
                    {{ daysLeft(user.software_access_until) }}
                  </td>
                  <td class="mono" style="font-size: 0.9rem; color: var(--amber)">
                    {{ user.credits }}
                  </td>
                  <td>
                    <div class="flex gap-2" @click.stop>
                      <button class="btn btn-ghost btn-sm" @click="openEditModal(user)">
                        Editar
                      </button>
                      <button class="btn btn-ghost btn-sm" @click="openCreditsModal(user)">
                        Créditos
                      </button>
                      <button
                        class="btn btn-ghost btn-sm"
                        @click="openLogoutModal(user)"
                        :disabled="!user.active_token"
                      >
                        Logout
                      </button>
                      <button class="btn btn-danger btn-sm" @click="openDeleteModal(user)">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- Expanded user detail -->
                <tr v-if="adminStore.selectedUser?.id === user.id && adminStore.showUserPanel">
                  <td colspan="7" class="user-details">
                    <div class="user-details-content">
                      <div
                        class="flex items-center justify-between"
                        style="margin-bottom: var(--space-4)"
                      >
                        <div class="user-detail-header">
                          <span class="mono" style="color: var(--amber)">{{ user.username }}</span>
                          <span class="detail-sub">— HISTÓRICO DE KEYS</span>
                        </div>
                        <button class="btn btn-ghost btn-sm" @click="adminStore.closeUserPanel">
                          Fechar ✕
                        </button>
                      </div>

                      <div
                        v-if="userStore.keys.length === 0"
                        class="empty-state"
                        style="padding: var(--space-8)"
                      >
                        <p>Nenhuma key gerada por este operador.</p>
                      </div>
                      <table v-else class="table-sm">
                        <thead>
                          <tr>
                            <th>Key</th>
                            <th>Criada em</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="key in userStore.keys" :key="key.id">
                            <td class="mono" style="font-size: 0.82rem; color: var(--amber)">
                              {{ key.key }}
                            </td>
                            <td class="mono" style="font-size: 0.82rem">
                              {{ formatDate(key.created_at) }}
                            </td>
                            <td>
                              <span v-if="key.reverted" class="badge badge-neutral">Revertida</span>
                              <span v-else-if="key.used" class="badge badge-warning">Usada</span>
                              <span v-else class="badge badge-success">Disponível</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- ── MODAL: Configurar Plano ── -->
    <div v-if="showResaleModal" class="modal-overlay" @click.self="showResaleModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Configurar Plano de Revenda</h3>
        </div>
        <div class="modal-body space-y-4">
          <div class="form-group">
            <label class="form-label">Duração (dias)</label>
            <select v-model="resaleForm.days" class="form-input form-select">
              <option :value="7">7 dias</option>
              <option :value="15">15 dias</option>
              <option :value="30">30 dias</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Preço (créditos)</label>
            <input
              v-model="resaleForm.price"
              type="number"
              class="form-input"
              min="0"
              step="0.01"
            />
          </div>
          <div class="form-group">
            <label class="flex items-center gap-2" style="cursor: pointer">
              <input v-model="resaleForm.is_active" type="checkbox" class="form-checkbox" />
              <span style="font-size: 0.9rem; color: var(--text-secondary)">
                Plano ativo (usuários podem gerar keys)
              </span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showResaleModal = false">Cancelar</button>
          <button
            class="btn btn-primary"
            @click="saveResalePlan"
            :disabled="adminStore.loading.saveResalePlan"
          >
            <span class="spinner" v-if="adminStore.loading.saveResalePlan" />
            <span v-else>Salvar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: Ajustar Créditos ── -->
    <div v-if="showCreditsModal" class="modal-overlay" @click.self="showCreditsModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Ajustar Créditos</h3>
        </div>
        <div class="modal-body space-y-4">
          <div class="credits-user-row">
            <span class="mono" style="color: var(--amber)">{{ creditsForm.username }}</span>
            <span class="cred-current-badge">
              <span class="ccb-label">SALDO</span>
              <span class="ccb-value">{{ creditsForm.current }}</span>
            </span>
          </div>
          <div class="form-group">
            <label class="form-label">Operação</label>
            <div class="op-toggle">
              <label class="op-option" :class="{ active: creditsForm.operation === 'add' }">
                <input
                  v-model="creditsForm.operation"
                  type="radio"
                  value="add"
                  style="display: none"
                />
                + Adicionar
              </label>
              <label class="op-option" :class="{ active: creditsForm.operation === 'remove' }">
                <input
                  v-model="creditsForm.operation"
                  type="radio"
                  value="remove"
                  style="display: none"
                />
                − Remover
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Quantidade</label>
            <input
              v-model="creditsForm.amount"
              type="number"
              class="form-input"
              min="0.01"
              step="0.01"
              placeholder="0"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showCreditsModal = false">Cancelar</button>
          <button
            class="btn btn-primary"
            @click="saveCredits"
            :disabled="adminStore.loading.adjustCredits"
          >
            <span class="spinner" v-if="adminStore.loading.adjustCredits" />
            <span v-else>{{ creditsForm.operation === 'add' ? 'Adicionar' : 'Remover' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: Editar Usuário ── -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Editar Operador</h3>
        </div>
        <div class="modal-body space-y-4">
          <div
            class="edit-user-tag mono"
            style="color: var(--amber); margin-bottom: var(--space-2)"
          >
            {{ editForm.username }}
          </div>
          <div class="form-group">
            <label class="form-label">Nova Senha <span class="optional">opcional</span></label>
            <input
              v-model="editForm.password"
              type="password"
              class="form-input"
              placeholder="Deixe vazio para não alterar"
            />
          </div>
          <div class="form-group">
            <label class="form-label"
              >Estender Licença <span class="optional">opcional</span></label
            >
            <select v-model="editForm.licenseDays" class="form-input form-select">
              <option value="">Não alterar</option>
              <option :value="7">+ 7 dias</option>
              <option :value="15">+ 15 dias</option>
              <option :value="30">+ 30 dias</option>
              <option value="date">Data específica</option>
            </select>
          </div>
          <div class="form-group" v-if="editForm.licenseDays === 'date'">
            <label class="form-label">Data de Expiração</label>
            <input v-model="editForm.customDate" type="date" class="form-input" />
          </div>
          <div class="form-group">
            <label class="flex items-center gap-2" style="cursor: pointer">
              <input v-model="editForm.isActive" type="checkbox" class="form-checkbox" />
              <span style="font-size: 0.9rem; color: var(--text-secondary)">Conta ativa</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showEditModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="saveEdit" :disabled="adminStore.loading.saveUser">
            <span class="spinner" v-if="adminStore.loading.saveUser" />
            <span v-else>Salvar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: Confirmar Delete ── -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title" style="color: var(--red)">⚠ Desativar Operador</h3>
        </div>
        <div class="modal-body">
          <p style="color: var(--text-secondary)">
            Tem certeza que deseja desativar
            <strong class="mono" style="color: var(--red)">{{
              adminStore.selectedUser?.username
            }}</strong
            >?
          </p>
          <p class="form-hint" style="margin-top: var(--space-2)">
            O operador perderá acesso ao sistema. Esta ação pode ser revertida via edição da conta.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showDeleteModal = false">Cancelar</button>
          <button class="btn btn-danger" @click="confirmDelete">Desativar</button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: Forçar Logout ── -->
    <div v-if="showLogoutModal" class="modal-overlay" @click.self="showLogoutModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Forçar Logout</h3>
        </div>
        <div class="modal-body">
          <p style="color: var(--text-secondary)">
            Desconectar
            <strong class="mono" style="color: var(--amber)">{{
              adminStore.selectedUser?.username
            }}</strong
            >?
          </p>
          <p class="form-hint" style="margin-top: var(--space-2)">
            O usuário precisará fazer login novamente no aplicativo.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showLogoutModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="confirmLogout">Desconectar</button>
        </div>
      </div>
    </div>

    <!-- ── TOASTS ── -->
    <div class="toast-container">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
      >
        <span>{{ toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : '◎' }}</span>
        {{ toast.message }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Admin Login Page ── */
.admin-login-page,
.loading-page,
.admin-dashboard-page {
  background-color: #090f0b;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  min-height: 100vh;
}

.admin-login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
}

.admin-login-wrap {
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.admin-login-brand {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.admin-logo {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--amber), var(--green));
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  color: var(--bg-void);
  flex-shrink: 0;
}

.admin-brand-title {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.admin-brand-sub {
  font-family: var(--font-ui);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--text-muted);
}

.admin-login-card {
  background: var(--bg-void);
  border: 1px solid var(--wire-active);
  border-top: 2px solid var(--amber);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg), var(--amber-glow);
}

.admin-login-form {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

/* Terminal header decoration */
.terminal-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0.55rem 1rem;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--wire);
}

.terminal-dots {
  display: flex;
  gap: 5px;
}

.terminal-dots span {
  width: 8px;
  height: 8px;
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
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

/* ── Admin Dashboard ── */
.admin-badge {
  font-family: var(--font-ui);
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--bg-void);
  background: var(--amber);
  padding: 0.15rem 0.5rem;
  border-radius: 1px;
}

.admin-main {
  padding-top: var(--space-6);
  padding-bottom: var(--space-8);
}

/* Section card title */
.section-card-title {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.section-card-sub {
  font-size: 0.82rem;
  color: var(--text-muted);
}

/* Resale config row */
.resale-config-row {
  display: flex;
  align-items: center;
  gap: 0;
  flex-wrap: wrap;
}

.rci {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: 0 var(--space-6) 0 0;
}

.rci-label {
  font-family: var(--font-ui);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.rci-value {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.rci-value small {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--text-muted);
  margin-left: 3px;
}

.rci-divider {
  width: 1px;
  height: 40px;
  background: var(--wire);
  margin-right: var(--space-6);
}

/* User detail header */
.user-detail-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-family: var(--font-mono);
  font-size: 0.9rem;
}

.detail-sub {
  font-family: var(--font-ui);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
}

/* Credits modal */
.credits-user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--wire);
  margin-bottom: var(--space-2);
}

.cred-current-badge {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  background: var(--amber-dim);
  border: 1px solid rgba(200, 164, 52, 0.2);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-3);
}

.ccb-label {
  font-family: var(--font-ui);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: rgba(200, 164, 52, 0.6);
}

.ccb-value {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--amber);
}

/* Operation toggle */
.op-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--wire-active);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.op-option {
  flex: 1;
  padding: 0.65rem 1rem;
  font-family: var(--font-ui);
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: center;
  cursor: pointer;
  color: var(--text-muted);
  background: var(--bg-void);
  transition: all var(--transition-fast);
  user-select: none;
}

.op-option:first-child {
  border-right: 1px solid var(--wire-active);
}

.op-option.active {
  background: var(--amber-dim);
  color: var(--amber);
}

/* Edit user tag */
.edit-user-tag {
  font-size: 1.1rem;
  font-weight: 700;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--wire);
}
</style>
