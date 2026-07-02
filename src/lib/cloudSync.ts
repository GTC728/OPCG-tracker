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
