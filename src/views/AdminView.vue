<!-- AdminView.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAdminStore, type User, type ResalePlan, type LicensePlan } from '@/stores/admin'
import { useToastStore } from '@/stores/toast'

const adminStore = useAdminStore()
const toastStore = useToastStore()

const showPlanModal = ref(false)
const showCreditsModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const showLogoutModal = ref(false)

const loginEmail = ref('')
const loginPassword = ref('')

// ─── Plan modal (shared for resale + license) ──────────────────────────────

type PlanModalMode = 'resale' | 'license'

const planModal = ref({
  mode: 'resale' as PlanModalMode,
  duration_days: '' as '' | number,
  price: '' as '' | number,
  is_active: true,
  isNew: false,
})

function openResalePlanModal(plan?: ResalePlan) {
  planModal.value = {
    mode: 'resale',
    duration_days: plan?.duration_days ?? '',
    price: plan?.price ?? '',
    is_active: plan?.is_active ?? true,
    isNew: !plan,
  }
  showPlanModal.value = true
}

function openLicensePlanModal(plan?: LicensePlan) {
  planModal.value = {
    mode: 'license',
    duration_days: plan?.duration_days ?? '',
    price: plan?.price ?? '',
    is_active: true,
    isNew: !plan,
  }
  showPlanModal.value = true
}

async function savePlan() {
  const days = Number(planModal.value.duration_days)
  const price = Number(planModal.value.price)

  if (!days || days <= 0) {
    toastStore.error('Informe uma duração válida')
    return
  }
  if (!price || price <= 0) {
    toastStore.error('Informe um preço válido')
    return
  }

  if (planModal.value.mode === 'resale') {
    const result = await adminStore.saveResalePlan(days, price, planModal.value.is_active)
    if (result.ok) {
      toastStore.success('Plano de revenda salvo!')
      showPlanModal.value = false
    } else toastStore.error(result.error)
  } else {
    const result = await adminStore.saveLicensePlan(days, price)
    if (result.ok) {
      toastStore.success('Plano de licença salvo!')
      showPlanModal.value = false
    } else toastStore.error(result.error)
  }
}

// ─── Credits modal ──────────────────────────────────────────────────────────

const creditsForm = ref({
  userId: '',
  username: '',
  current: 0,
  amount: '',
  operation: 'add' as 'add' | 'remove',
})

// ─── Edit user modal ─────────────────────────────────────────────────────────

const editForm = ref({
  id: '',
  username: '',
  password: '',
  licenseDays: '' as '' | number | 'date',
  customDate: '',
  isActive: true,
})

// ─── Data loading ─────────────────────────────────────────────────────────────

watch(
  () => adminStore.supabaseAuthed,
  async (authed) => {
    if (!authed) return
    await Promise.all([
      adminStore.loadUsers(),
      adminStore.loadResalePlans(),
      adminStore.loadLicensePlans(),
    ])
  },
  { immediate: true },
)

// ─── Handlers ────────────────────────────────────────────────────────────────

async function adminLogin() {
  if (!loginEmail.value || !loginPassword.value) {
    adminStore.error = 'Preencha e-mail e senha.'
    return
  }
  const ok = await adminStore.login(loginEmail.value, loginPassword.value)
  if (ok) {
    loginEmail.value = ''
    loginPassword.value = ''
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

  if (result.ok) {
    toastStore.success(
      `${amount} créditos ${creditsForm.value.operation === 'add' ? 'adicionados' : 'removidos'} para ${creditsForm.value.username}`,
    )
    showCreditsModal.value = false
  } else {
    toastStore.error(result.error)
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

  if (editForm.value.password) patch.password_hash = editForm.value.password

  if (editForm.value.licenseDays === 'date' && editForm.value.customDate) {
    patch.software_access_until = new Date(editForm.value.customDate).toISOString()
  } else if (typeof editForm.value.licenseDays === 'number') {
    patch.software_access_until = new Date(
      Date.now() + editForm.value.licenseDays * 86400000,
    ).toISOString()
  }

  const result = await adminStore.updateUser(editForm.value.id, patch)
  if (result.ok) {
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

function expandUser(user: User) {
  adminStore.selectUser(user)
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
  <div class="admin-login-page" v-if="!adminStore.supabaseAuthed">
    <div class="admin-login-wrap">
      <div class="admin-login-brand">
        <div class="admin-logo">◈</div>
        <div>
          <h1 class="admin-brand-title">Administração</h1>
          <p class="admin-brand-sub">PAINEL DE CONTROLE // ACESSO RESTRITO</p>
        </div>
      </div>

      <div class="admin-login-card">
        <div class="terminal-header">
          <span class="terminal-dots"><span></span><span></span><span></span></span>
          <span class="terminal-title">AUTENTICAÇÃO ADMINISTRATIVA</span>
        </div>

        <div
          v-if="adminStore.error"
          class="alert alert-error"
          style="margin: var(--space-5); margin-bottom: 0"
        >
          <span>⚠</span> {{ adminStore.error }}
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
          <button
            type="submit"
            class="btn btn-primary btn-lg w-full"
            :disabled="adminStore.loading.auth"
          >
            <span class="spinner" v-if="adminStore.loading.auth" />
            <span v-else>▶ ACESSAR PAINEL</span>
          </button>
        </form>
      </div>
    </div>
  </div>

  <!-- ── ADMIN DASHBOARD ──────────────────────────────────────── -->
  <div class="admin-dashboard-page" v-else>
    <header class="app-header">
      <div class="container header-content">
        <div class="logo">
          <img src="/src/assets/logo.png" class="logo-icon" />
          <span>Painel administrativo</span>
          <span class="admin-badge">ADMIN</span>
        </div>
        <button class="btn btn-ghost" @click="adminStore.logout">Sair</button>
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

      <!-- ── Resale Plans ── -->
      <div class="card" style="margin-bottom: var(--space-5)">
        <div class="card-header">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="section-card-title">Planos de Revenda</h2>
              <p class="section-card-sub">Keys geradas pelos revendedores</p>
            </div>
            <button class="btn btn-secondary btn-sm" @click="openResalePlanModal()">
              + Novo Plano
            </button>
          </div>
        </div>
        <div class="card-body" style="padding: 0">
          <div
            v-if="adminStore.loading.resalePlans"
            class="empty-state"
            style="padding: var(--space-6)"
          >
            <span class="spinner" />
            <p>Carregando...</p>
          </div>
          <div
            v-else-if="adminStore.resalePlans.length === 0"
            class="empty-state"
            style="padding: var(--space-6)"
          >
            <p>Nenhum plano de revenda cadastrado.</p>
          </div>
          <table v-else>
            <thead>
              <tr>
                <th>Duração</th>
                <th>Preço (créditos)</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="plan in adminStore.resalePlans" :key="plan.duration_days">
                <td class="mono" style="font-weight: 600">{{ plan.duration_days }} dias</td>
                <td class="mono" style="color: var(--amber)">{{ plan.price }}</td>
                <td>
                  <span :class="['badge', plan.is_active ? 'badge-success' : 'badge-neutral']">
                    {{ plan.is_active ? 'Ativo' : 'Desativado' }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-ghost btn-sm" @click="openResalePlanModal(plan)">
                    Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── License Plans ── -->
      <div class="card" style="margin-bottom: var(--space-6)">
        <div class="card-header">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="section-card-title">Planos de Licença</h2>
              <p class="section-card-sub">Planos disponíveis para compra direta pelos usuários</p>
            </div>
            <button class="btn btn-secondary btn-sm" @click="openLicensePlanModal()">
              + Novo Plano
            </button>
          </div>
        </div>
        <div class="card-body" style="padding: 0">
          <div
            v-if="adminStore.loading.licensePlans"
            class="empty-state"
            style="padding: var(--space-6)"
          >
            <span class="spinner" />
            <p>Carregando...</p>
          </div>
          <div
            v-else-if="adminStore.licensePlans.length === 0"
            class="empty-state"
            style="padding: var(--space-6)"
          >
            <p>Nenhum plano de licença cadastrado.</p>
          </div>
          <table v-else>
            <thead>
              <tr>
                <th>Duração</th>
                <th>Preço (créditos)</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="plan in adminStore.licensePlans" :key="plan.duration_days">
                <td class="mono" style="font-weight: 600">{{ plan.duration_days }} dias</td>
                <td class="mono" style="color: var(--amber)">{{ plan.price }}</td>
                <td>
                  <button class="btn btn-ghost btn-sm" @click="openLicensePlanModal(plan)">
                    Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
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
                <tr
                  class="user-row"
                  @click="adminStore.selectedUser ? adminStore.closeUserPanel() : expandUser(user)"
                >
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
                  <td class="mono" style="font-size: var(--text-xs)">
                    {{ formatDate(user.software_access_until) }}
                  </td>
                  <td class="mono" style="font-size: var(--text-xs)">
                    {{ daysLeft(user.software_access_until) }}
                  </td>
                  <td class="mono" style="font-size: var(--text-sm); color: var(--amber)">
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
                        v-if="adminStore.loading.userKeys"
                        class="empty-state"
                        style="padding: var(--space-6)"
                      >
                        <span class="spinner" />
                        <p>Carregando keys...</p>
                      </div>

                      <div
                        v-else-if="adminStore.selectedUserKeys.length === 0"
                        class="empty-state"
                        style="padding: var(--space-8)"
                      >
                        <p>Nenhuma key gerada por este operador.</p>
                      </div>

                      <table v-else class="table-sm">
                        <thead>
                          <tr>
                            <th>Key</th>
                            <th>Duração</th>
                            <th>Criada em</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="key in adminStore.selectedUserKeys" :key="key.id">
                            <td class="mono" style="font-size: var(--text-xs); color: var(--amber)">
                              {{ key.key }}
                            </td>
                            <td class="mono" style="font-size: var(--text-xs)">
                              {{ key.duration_days }}d
                            </td>
                            <td class="mono" style="font-size: var(--text-xs)">
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

    <!-- ── MODAL: Plano (revenda ou licença) ── -->
    <div v-if="showPlanModal" class="modal-overlay" @click.self="showPlanModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ planModal.isNew ? 'Novo' : 'Editar' }}
            {{ planModal.mode === 'resale' ? 'Plano de Revenda' : 'Plano de Licença' }}
          </h3>
        </div>
        <div class="modal-body space-y-4">
          <div class="form-group">
            <label class="form-label">Duração (dias)</label>
            <input
              v-model="planModal.duration_days"
              type="number"
              class="form-input"
              min="1"
              step="1"
              placeholder="Ex: 30"
              :readonly="!planModal.isNew"
              :style="!planModal.isNew ? 'opacity: 0.6; cursor: not-allowed' : ''"
            />
            <p v-if="!planModal.isNew" class="form-hint">
              A duração é a chave primária e não pode ser alterada. Crie um novo plano se
              necessário.
            </p>
          </div>
          <div class="form-group">
            <label class="form-label">Preço (créditos)</label>
            <input
              v-model="planModal.price"
              type="number"
              class="form-input"
              min="1"
              step="1"
              placeholder="Ex: 20"
            />
          </div>
          <div v-if="planModal.mode === 'resale'" class="form-group">
            <label class="flex items-center gap-2" style="cursor: pointer">
              <input v-model="planModal.is_active" type="checkbox" class="form-checkbox" />
              <span style="font-size: var(--text-sm); color: var(--text-secondary)"
                >Plano ativo (visível para revendedores)</span
              >
            </label>
          </div>
          <div
            v-if="planModal.mode === 'resale'"
            class="form-hint"
            style="margin-top: var(--space-2)"
          >
            ⚠ Ao criar um plano de revenda com nova duração, certifique-se de que esse mesmo valor
            de duração existe na tabela de <strong>Planos de Licença</strong> (a FK da tabela keys
            exige isso).
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showPlanModal = false">Cancelar</button>
          <button
            class="btn btn-primary"
            @click="savePlan"
            :disabled="adminStore.loading.saveResalePlan || adminStore.loading.saveLicensePlan"
          >
            <span
              class="spinner"
              v-if="adminStore.loading.saveResalePlan || adminStore.loading.saveLicensePlan"
            />
            <span v-else>Salvar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: Créditos ── -->
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
              min="1"
              step="1"
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
              <span style="font-size: var(--text-sm); color: var(--text-secondary)">Conta ativa</span>
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
  font-size: var(--text-2xl);
  color: var(--bg-void);
  flex-shrink: 0;
}

.admin-brand-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.admin-brand-sub {
  font-family: var(--font-ui);
  font-size: var(--text-2xs);
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
  font-size: var(--text-2xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

/* ── Stats Grid ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: var(--bg-surface);
  border: 1px solid var(--wire);
  border-radius: var(--radius-sm);
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--wire-active);
}

.stat-card.success::before {
  background: var(--green);
}
.stat-card.warning::before {
  background: var(--orange);
}

.stat-label {
  font-family: var(--font-ui);
  font-size: var(--text-2xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.stat-value {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
}

/* ── Admin Dashboard ── */
.admin-badge {
  font-family: var(--font-ui);
  font-size: var(--text-base);
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
  font-size: var(--text-base);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.section-card-sub {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

/* User detail header */
.user-detail-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.detail-sub {
  font-family: var(--font-ui);
  font-size: var(--text-2xs);
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
  font-size: var(--text-2xs);
  font-weight: 700;
  letter-spacing: 0.14em;
  color: rgba(200, 164, 52, 0.6);
}

.ccb-value {
  font-family: var(--font-display);
  font-size: var(--text-xl);
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
  font-size: var(--text-sm);
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
  font-size: var(--text-lg);
  font-weight: 700;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--wire);
}
</style>
