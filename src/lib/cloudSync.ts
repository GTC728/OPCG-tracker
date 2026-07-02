import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import { APP_VERSION, SCHEMA_VERSION } from '@/lib/constants'
import type { AppState } from '@/types'

export interface CloudSnapshotRow {
  id: string
  user_id: string
  state: AppState
  schema_version: number
  app_version: string
  device_label: string
  created_at: string
}

export interface GroupCloudState {
  group_key: string
  state: AppState
  schema_version: number
  app_version: string
  device_label: string
  updated_by: string
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

export async function getCloudSession(): Promise<{ session: Session | null; user: User | null }> {
  const supabase = await getSupabaseClient()
  if (!supabase) return { session: null, user: null }

  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return {
    session: data.session,
    user: data.session?.user ?? null,
  }
}

export async function signInWithEmail(email: string): Promise<void> {
  const supabase = await requireClient()
  const redirectTo = window.location.origin
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })
  if (error) throw error
}

export async function signOutCloud(): Promise<void> {
  const supabase = await requireClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

async function createGroupKey(groupCode: string): Promise<string> {
  const normalizedCode = groupCode.trim().toLowerCase()
  if (normalizedCode.length < 4) {
    throw new Error('群組碼至少需要 4 個字元')
  }

  const input = new TextEncoder().encode(`opcg-tracker-group:${normalizedCode}`)
  const digest = await crypto.subtle.digest('SHA-256', input)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function uploadCloudSnapshot(state: AppState, deviceLabel: string): Promise<void> {
  const supabase = await requireClient()
  const { user } = await getCloudSession()
  if (!user) throw new Error('請先登入')

  const { error } = await supabase.from('app_state_snapshots').insert({
    user_id: user.id,
    state,
    schema_version: SCHEMA_VERSION,
    app_version: APP_VERSION,
    device_label: deviceLabel.trim() || 'Unknown device',
  })
  if (error) throw error
}

export async function loadGroupCloudState(groupCode: string): Promise<GroupCloudState | null> {
  const supabase = await requireClient()
  const { user } = await getCloudSession()
  if (!user) throw new Error('請先登入')

  const groupKey = await createGroupKey(groupCode)
  const { data, error } = await supabase
    .from('group_app_states')
    .select('*')
    .eq('group_key', groupKey)
    .maybeSingle()

  if (error) throw error
  return data as GroupCloudState | null
}

export async function uploadGroupCloudState(
  groupCode: string,
  state: AppState,
  deviceLabel: string,
): Promise<void> {
  const supabase = await requireClient()
  const { user } = await getCloudSession()
  if (!user) throw new Error('請先登入')

  const groupKey = await createGroupKey(groupCode)
  const { error } = await supabase.from('group_app_states').upsert({
    group_key: groupKey,
    state,
    schema_version: SCHEMA_VERSION,
    app_version: APP_VERSION,
    device_label: deviceLabel.trim() || 'Unknown device',
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function loadLatestCloudSnapshot(): Promise<CloudSnapshotRow | null> {
  const supabase = await requireClient()
  const { user } = await getCloudSession()
  if (!user) throw new Error('請先登入')

  const { data, error } = await supabase
    .from('app_state_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as CloudSnapshotRow | null
}
