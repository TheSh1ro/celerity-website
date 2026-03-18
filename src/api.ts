// src/api.ts
import { createClient } from '@supabase/supabase-js'
import { SessionInvalidError, resolveError } from '@/errors'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export { supabase }

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface RpcResponse {
  status: string
  [key: string]: unknown
}

export interface RpcSuccess<T extends RpcResponse> {
  ok: true
  data: T
}

export interface RpcFailure {
  ok: false
  error: string
}

export type RpcResult<T extends RpcResponse> = RpcSuccess<T> | RpcFailure

// ─── Session invalid handler ──────────────────────────────────────────────────

let onSessionInvalid: (() => void) | null = null

export function setSessionInvalidHandler(fn: () => void) {
  onSessionInvalid = fn
}

// ─── Token providers ──────────────────────────────────────────────────────────

function getUserToken(): string {
  return localStorage.getItem('session_token') ?? ''
}

async function getAdminToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ''
}

// ─── HTTP base ────────────────────────────────────────────────────────────────

async function callRpc(
  fn: string,
  body: Record<string, unknown>,
  token: string,
): Promise<RpcResponse> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const data: RpcResponse = await res.json()

  if (data.status === 'session_invalid') throw new SessionInvalidError()

  return data
}

async function callFetch(path: string, opts: RequestInit, token: string): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
      Prefer: 'return=representation',
      ...(opts.headers as Record<string, string>),
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`)
  }

  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// ─── Interface pública ────────────────────────────────────────────────────────

export async function userRpc<T extends RpcResponse>(
  fn: string,
  body: Record<string, unknown> = {},
  injectToken = true,
): Promise<RpcResult<T>> {
  try {
    const token = getUserToken()
    const enrichedBody = injectToken && token ? { ...body, p_token: token } : body
    const data = (await callRpc(fn, enrichedBody, '')) as T
    if (data.status !== 'ok') return { ok: false, error: resolveError(data.status) }
    return { ok: true, data }
  } catch (err) {
    if (err instanceof SessionInvalidError) {
      onSessionInvalid?.()
      return { ok: false, error: resolveError('session_invalid') }
    }
    return { ok: false, error: resolveError('network_error') }
  }
}

export async function adminRpc<T extends RpcResponse>(
  fn: string,
  body: Record<string, unknown> = {},
): Promise<RpcResult<T>> {
  try {
    const token = await getAdminToken()
    const data = (await callRpc(fn, body, token)) as T
    if (data.status !== 'ok') return { ok: false, error: resolveError(data.status) }
    return { ok: true, data }
  } catch (err) {
    if (err instanceof SessionInvalidError) {
      onSessionInvalid?.()
      return { ok: false, error: resolveError('session_invalid') }
    }
    return { ok: false, error: resolveError('network_error') }
  }
}

export async function adminFetch(path: string, opts: RequestInit = {}): Promise<unknown> {
  const token = await getAdminToken()
  return callFetch(path, opts, token)
}
