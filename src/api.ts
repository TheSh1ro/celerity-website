// src/api.ts - Centralização de chamadas API
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

interface RpcResponse {
  status: string
  [key: string]: any
}

export async function rpc(
  fn: string,
  body: Record<string, unknown>,
  token?: string,
): Promise<RpcResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function supabaseFetch(
  path: string,
  opts: RequestInit = {},
  jwt?: string,
): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${jwt || SUPABASE_ANON_KEY}`,
      Prefer: 'return=representation',
      ...((opts.headers as Record<string, string>) ?? {}),
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `HTTP ${res.status}`)
  }

  const text = await res.text()
  return text ? JSON.parse(text) : null
}
