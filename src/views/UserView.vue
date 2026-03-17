<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// ── Tipos ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string
  username: string
  email: string | null
  credits: number
  software_access_until: string | null
}

interface Key {
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

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface RpcResponse {
  status: string
  key?: string
  keys?: Key[]
  software_access_until?: string
  days_ago?: number
  id?: string
  username?: string
  email?: string | null
  credits?: number
}

interface SupabaseError {
  message: string
}

// ── Estado ───────────────────────────────────────────────────────────────────

const profile = ref<UserProfile | null>(null)
const keys = ref<Key[]>([])
const loadingProfile = ref(true)
const loadingKeys = ref(true)
const toasts = ref<Toast[]>([])
let toastId = 0

const generatingKey = ref(false)
const revertingKeyId = ref<string | null>(null)
const buyingDays = ref<number | null>(null)

const showRevertConfirm = ref(false)
const revertTarget = ref<Key | null>(null)

const showBuyConfirm = ref(false)
const buyTarget = ref<number | null>(null)

// ── Computed ─────────────────────────────────────────────────────────────────

const token = computed(() => localStorage.getItem('session_token') ?? '')

const accessUntil = computed(() => profile.value?.software_access_until ?? null)

const daysLeft = computed(() => {
  if (!accessUntil.value) return 0
  return Math.max(0, Math.ceil((new Date(accessUntil.value).getTime() - Date.now()) / 86400000))
})

const isExpired = computed(() => daysLeft.value === 0)

const keyStats = computed(() => ({
  total: keys.value.length,
  used: keys.value.filter((k) => k.used).length,
  available: keys.value.filter((k) => !k.used && !k.reverted).length,
  reverted: keys.value.filter((k) => k.reverted).length,
}))

const plans = [
  { days: 7, price: 10 },
  { days: 15, price: 20 },
  { days: 30, price: 30 },
]

const keyPlan = { days: 30, price: 20 }

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
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

function keyStatusLabel(k: Key): string {
  if (k.reverted) return 'revertida'
  if (k.used) return 'usada'
  return 'disponível'
}

function keyStatusBadge(k: Key): string {
  if (k.reverted) return 'badge badge-muted'
  if (k.used) return 'badge badge-amber'
  return 'badge badge-green'
}

// ── API ──────────────────────────────────────────────────────────────────────

async function rpc(fn: string, body: Record<string, unknown>): Promise<RpcResponse> {
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
  return res.json() as Promise<RpcResponse>
}

// ── Carregamento ──────────────────────────────────────────────────────────────

async function loadProfile() {
  loadingProfile.value = true
  try {
    const result = await rpc('get_user_profile', { p_token: token.value })
    if (result.status !== 'ok') {
      router.push('/')
      return
    }
    profile.value = {
      id: result.id!,
      username: result.username!,
      email: result.email ?? null,
      credits: result.credits!,
      software_access_until: result.software_access_until ?? null,
    }
  } catch (e) {
    addToast('Erro ao carregar perfil: ' + getErrorMessage(e), 'error')
  } finally {
    loadingProfile.value = false
  }
}

async function loadKeys() {
  loadingKeys.value = true
  try {
    const result = await rpc('get_user_keys', { p_token: token.value })
    if (result.status === 'ok') {
      keys.value = result.keys ?? []
    }
  } catch (e) {
    addToast('Erro ao carregar keys: ' + getErrorMessage(e), 'error')
  } finally {
    loadingKeys.value = false
  }
}

// ── Ações ─────────────────────────────────────────────────────────────────────

async function generateKey() {
  generatingKey.value = true
  try {
    const result = await rpc('generate_key', { p_token: token.value })
    if (result.status === 'ok') {
      addToast('Key gerada com sucesso!', 'success')
      await Promise.all([loadProfile(), loadKeys()])
      return
    }
    const messages: Record<string, string> = {
      session_invalid: 'Sessão inválida. Faça login novamente.',
      inactive: 'Conta desativada.',
      insufficient_credits: 'Créditos insuficientes.',
    }
    addToast(messages[result.status] ?? `Erro: ${result.status}`, 'error')
  } catch (e) {
    addToast('Erro: ' + getErrorMessage(e), 'error')
  } finally {
    generatingKey.value = false
  }
}

function openRevertConfirm(k: Key) {
  revertTarget.value = k
  showRevertConfirm.value = true
}

async function revertKey() {
  if (!revertTarget.value) return
  revertingKeyId.value = revertTarget.value.id
  showRevertConfirm.value = false
  try {
    const result = await rpc('revert_key', {
      p_token: token.value,
      p_key_id: revertTarget.value.id,
    })
    if (result.status === 'ok') {
      addToast('Key revertida. Créditos devolvidos.', 'success')
      await Promise.all([loadProfile(), loadKeys()])
      return
    }
    const messages: Record<string, string> = {
      session_invalid: 'Sessão inválida.',
      key_not_found: 'Key não encontrada.',
      forbidden: 'Você não tem permissão.',
      key_already_used: 'Key já foi utilizada.',
      key_already_reverted: 'Key já foi revertida.',
    }
    addToast(messages[result.status] ?? `Erro: ${result.status}`, 'error')
  } catch (e) {
    addToast('Erro: ' + getErrorMessage(e), 'error')
  } finally {
    revertingKeyId.value = null
    revertTarget.value = null
  }
}

function openBuyConfirm(days: number) {
  buyTarget.value = days
  showBuyConfirm.value = true
}

async function buyDays() {
  if (!buyTarget.value) return
  buyingDays.value = buyTarget.value
  showBuyConfirm.value = false
  try {
    const result = await rpc('buy_days', {
      p_token: token.value,
      p_duration_days: buyTarget.value,
    })
    if (result.status === 'ok') {
      addToast(`+${buyTarget.value} dias adicionados!`, 'success')
      await loadProfile()
      return
    }
    const messages: Record<string, string> = {
      session_invalid: 'Sessão inválida.',
      inactive: 'Conta desativada.',
      invalid_plan: 'Plano inválido.',
      insufficient_credits: 'Créditos insuficientes.',
    }
    addToast(messages[result.status] ?? `Erro: ${result.status}`, 'error')
  } catch (e) {
    addToast('Erro: ' + getErrorMessage(e), 'error')
  } finally {
    buyingDays.value = null
    buyTarget.value = null
  }
}

function copyKey(key: string) {
  navigator.clipboard.writeText(key)
  addToast('Key copiada!', 'info')
}

function logout() {
  localStorage.clear()
  router.push('/')
}

// ── Init ──────────────────────────────────────────────────────────────────────

onMounted(async () => {
  if (!token.value) {
    router.push('/')
    return
  }
  await loadProfile()
  await loadKeys()
})
</script>

<template>
  <!-- HEADER -->
  <header class="app-header">
    <div class="logo">
      <div class="logo-icon">⬡</div>
      <span>DAYZ<span>BOT</span></span>
    </div>
    <div class="header-right" v-if="profile">
      <div class="header-pill">
        <span class="pill-label">CRÉDITOS</span>
        <span class="pill-value text-amber">{{ profile.credits }}</span>
      </div>
      <div class="header-pill">
        <span class="pill-label">LICENÇA</span>
        <span :class="isExpired ? 'pill-value text-red' : 'pill-value text-green'">
          {{ isExpired ? 'EXPIRADA' : `${daysLeft}d` }}
        </span>
      </div>
      <div class="header-pill">
        <span class="pill-label">USUÁRIO</span>
        <span class="pill-value">{{ profile.username }}</span>
      </div>
      <button class="btn btn-ghost btn-sm" @click="logout">SAIR</button>
    </div>
  </header>

  <main class="page-content" v-if="!loadingProfile">
    <!-- STATS DE KEYS -->
    <div class="flex gap-4 wrap" style="margin-bottom: var(--space-6)">
      <div class="stat-card">
        <div class="stat-label">Keys Geradas</div>
        <div class="stat-value">{{ keyStats.total }}</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Disponíveis</div>
        <div class="stat-value">{{ keyStats.available }}</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-label">Usadas</div>
        <div class="stat-value">{{ keyStats.used }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Revertidas</div>
        <div class="stat-value">{{ keyStats.reverted }}</div>
      </div>
    </div>

    <!-- GERAR KEY -->
    <div class="section-block">
      <div
        class="flex items-center justify-between wrap gap-4"
        style="margin-bottom: var(--space-4)"
      >
        <div>
          <div class="section-label">GERAR KEY</div>
          <p class="section-desc">{{ keyPlan.days }} dias · custa {{ keyPlan.price }} créditos</p>
        </div>
        <button
          class="btn btn-primary"
          :disabled="generatingKey || (profile?.credits ?? 0) < keyPlan.price"
          @click="generateKey"
        >
          <span class="spinner" v-if="generatingKey" />
          <span v-else>+ GERAR KEY</span>
        </button>
      </div>
    </div>

    <div class="divider" style="margin-bottom: var(--space-6)" />

    <!-- ESTENDER LICENÇA -->
    <div class="section-block">
      <div class="section-label" style="margin-bottom: var(--space-4)">ESTENDER LICENÇA</div>
      <div class="plans-grid">
        <div class="plan-card" v-for="plan in plans" :key="plan.days">
          <div class="plan-days">{{ plan.days }}<span>d</span></div>
          <div class="plan-price">{{ plan.price }} créditos</div>
          <button
            class="btn btn-ghost btn-sm btn-full"
            :disabled="buyingDays === plan.days || (profile?.credits ?? 0) < plan.price"
            @click="openBuyConfirm(plan.days)"
          >
            <span class="spinner" v-if="buyingDays === plan.days" />
            <span v-else>COMPRAR</span>
          </button>
        </div>
      </div>
    </div>

    <div class="divider" style="margin-bottom: var(--space-6)" />

    <!-- HISTÓRICO DE KEYS -->
    <div>
      <div class="flex items-center justify-between" style="margin-bottom: var(--space-4)">
        <div class="section-label">HISTÓRICO DE KEYS</div>
        <button class="btn btn-ghost btn-sm" @click="loadKeys">↺ ATUALIZAR</button>
      </div>
      <div class="table-wrap">
        <div class="loading-row" v-if="loadingKeys"><span class="spinner" /> Carregando…</div>
        <table v-else>
          <thead>
            <tr>
              <th>Key</th>
              <th>Gerada em</th>
              <th>Status</th>
              <th>Usada em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="keys.length === 0">
              <td colspan="5" class="empty-row">Nenhuma key gerada ainda.</td>
            </tr>
            <tr v-for="k in keys" :key="k.id">
              <td>
                <div class="key-cell">
                  <span class="mono key-value">{{ k.key }}</span>
                  <button
                    class="btn btn-ghost btn-sm"
                    @click="copyKey(k.key)"
                    v-if="!k.used && !k.reverted"
                  >
                    ⎘
                  </button>
                </div>
              </td>
              <td>{{ formatDate(k.created_at) }}</td>
              <td>
                <span :class="keyStatusBadge(k)">{{ keyStatusLabel(k) }}</span>
              </td>
              <td>{{ formatDate(k.used_at) }}</td>
              <td>
                <button
                  class="btn btn-danger btn-sm"
                  v-if="!k.used && !k.reverted"
                  :disabled="revertingKeyId === k.id"
                  @click="openRevertConfirm(k)"
                >
                  <span class="spinner" v-if="revertingKeyId === k.id" />
                  <span v-else>REVERTER</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>

  <div class="loading-page" v-else>
    <span class="spinner" />
  </div>

  <!-- MODAL: CONFIRMAR REVERSÃO -->
  <div class="overlay" v-if="showRevertConfirm" @click.self="showRevertConfirm = false">
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">Reverter key</span>
      </div>
      <div class="flex flex-col gap-2">
        <span
          >Deseja reverter esta key e recuperar
          <strong class="text-amber">{{ revertTarget?.price }} créditos</strong>?
        </span>
        <span class="mono key-preview">{{ revertTarget?.key }}</span>
        <span style="color: var(--muted); font-size: var(--text-sm)">
          A key será invalidada permanentemente.
        </span>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="showRevertConfirm = false">Cancelar</button>
        <button class="btn btn-danger" @click="revertKey">Reverter</button>
      </div>
    </div>
  </div>

  <!-- MODAL: CONFIRMAR COMPRA DE DIAS -->
  <div class="overlay" v-if="showBuyConfirm" @click.self="showBuyConfirm = false">
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">Estender licença</span>
      </div>
      <div class="flex flex-col gap-2">
        <span>
          Adicionar <strong class="text-green">{{ buyTarget }} dias</strong> por
          <strong class="text-amber">
            {{ plans.find((p) => p.days === buyTarget)?.price ?? '?' }} créditos </strong
          >?
        </span>
        <span style="color: var(--muted); font-size: var(--text-sm)">
          Nova expiração:
          {{
            formatDate(
              new Date(
                Math.max(
                  profile?.software_access_until
                    ? new Date(profile.software_access_until).getTime()
                    : Date.now(),
                  Date.now(),
                ) +
                  (buyTarget ?? 0) * 86400000,
              ).toISOString(),
            )
          }}
        </span>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" @click="showBuyConfirm = false">Cancelar</button>
        <button class="btn btn-primary" @click="buyDays">Confirmar</button>
      </div>
    </div>
  </div>

  <!-- TOASTS -->
  <div class="toast-container">
    <div v-for="t in toasts" :key="t.id" :class="`toast toast-${t.type}`">
      <span>{{ t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ' }}</span>
      {{ t.message }}
    </div>
  </div>
</template>

<style scoped>
.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.header-pill {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 4px 10px;
}

.pill-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  color: var(--muted);
}

.pill-value {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-hi);
}

.section-block {
  margin-bottom: var(--space-6);
}

.section-desc {
  font-size: var(--text-sm);
  color: var(--muted);
  margin-top: var(--space-1);
}

.plans-grid {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.plan-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-5);
  min-width: 140px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
  text-align: center;
}

.plan-days {
  font-family: var(--font-mono);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--text-hi);
  line-height: 1;
}

.plan-days span {
  font-size: var(--text-md);
  color: var(--muted);
}

.plan-price {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--amber);
}

.key-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.key-value {
  font-size: var(--text-sm);
  color: var(--text);
}

.key-preview {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--muted);
  word-break: break-all;
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

.loading-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
