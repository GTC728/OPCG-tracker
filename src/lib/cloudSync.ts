import type { SupabaseClient } from '@supabase/supabase-js'
import { APP_VERSION, SCHEMA_VERSION } from '@/lib/constants'
import type { AppState } from '@/types'

export interface SharedCloudState {
  group_key: string
  state: AppState
  schema_version: number
  app_version: string
  device_label: string
  updated_at: string
}

let client: SupabaseClient | null = null

export function isCloudConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!isCloudConfigured()) return null
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js')
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    )
  }
  return client
}

async function requireClient(): Promise<SupabaseClient> {
  const supabase = await getSupabaseClient()
  if (!supabase) {
    throw new Error('尚未設定 Supabase')
  }
  return supabase
}

async function createGroupKey(pin: string): Promise<string> {
  const normalizedPin = pin.trim()
  if (normalizedPin.length < 4) {
    throw new Error('PIN 至少需要 4 個字元')
  }

  const input = new TextEncoder().encode(`opcg-tracker:${normalizedPin}`)
  const digest = await crypto.subtle.digest('SHA-256', input)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function getSharedCloudState(pin: string): Promise<SharedCloudState | null> {
  const supabase = await requireClient()
  const groupKey = await createGroupKey(pin)

  const { data, error } = await supabase
    .from('shared_app_states')
    .select('*')
    .eq('group_key', groupKey)
    .maybeSingle()

  if (error) throw error
  return data as SharedCloudState | null
}

export async function uploadSharedCloudState(
  pin: string,
  state: AppState,
  deviceLabel: string,
): Promise<void> {
  const supabase = await requireClient()
  const groupKey = await createGroupKey(pin)

  const { error } = await supabase.from('shared_app_states').upsert({
    group_key: groupKey,
    state,
    schema_version: SCHEMA_VERSION,
    app_version: APP_VERSION,
    device_label: deviceLabel.trim() || 'Unknown device',
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export function maskPin(pin: string): string {
  const trimmed = pin.trim()
  if (trimmed.length <= 2) return '*'.repeat(trimmed.length)
  return `${trimmed.slice(0, 1)}${'*'.repeat(Math.max(2, trimmed.length - 2))}${trimmed.slice(-1)}`
}
