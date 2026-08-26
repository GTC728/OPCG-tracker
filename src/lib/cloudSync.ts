import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import { APP_VERSION, SCHEMA_VERSION } from '@/lib/constants'
import type { AppState, GroupMemberRecord, GroupMemberRole } from '@/types'

export interface CloudSnapshotRow {
  id: string
  user_id: string
  state: AppState
  schema_version: number
  app_version: string
  device_label: string
  created_at: string
}

export interface CloudSnapshotMeta {
  id: string
  schema_version: number
  app_version: string
  device_label: string
  created_at: string
}

export interface GroupCloudSnapshotRow {
  id: string
  group_key: string
  state: AppState
  schema_version: number
  app_version: string
  device_label: string
  updated_by: string
  created_at: string
}

export interface GroupCloudSnapshotMeta {
  id: string
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

function getSupabaseConfig(): { url: string; key: string } | null {
  const rawUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
  const key = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  if (!rawUrl || !key) return null

  try {
    const parsed = new URL(rawUrl)
    return { url: parsed.origin, key }
  } catch {
    throw new Error('Supabase URL 格式不正確')
  }
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const config = getSupabaseConfig()
  if (!config) return null
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js')
    client = createClient(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
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

export function getSupabaseProjectHost(): string | null {
  const config = getSupabaseConfig()
  if (!config) return null
  try {
    return new URL(config.url).hostname
  } catch {
    return null
  }
}

export type SupabaseReachability =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'unreachable' | 'auth_unhealthy' }

export async function probeSupabaseReachable(): Promise<SupabaseReachability> {
  const config = getSupabaseConfig()
  if (!config) return { ok: false, reason: 'not_configured' }

  try {
    const response = await fetch(`${config.url}/auth/v1/health`, {
      headers: { apikey: config.key },
    })
    if (!response.ok) return { ok: false, reason: 'auth_unhealthy' }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'unreachable' }
  }
}

export function getAuthRedirectTo(): string {
  const origin = window.location.origin.replace(/\/+$/, '')
  return `${origin}/auth/callback`
}

export function isAuthCallbackLocation(): boolean {
  const path = window.location.pathname.replace(/\/+$/, '')
  if (path.endsWith('/auth/callback')) return true
  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return Boolean(
    search.get('code') ||
      search.get('token_hash') ||
      hash.get('access_token') ||
      hash.get('token_hash') ||
      hash.get('type') === 'magiclink' ||
      hash.get('type') === 'email',
  )
}

export async function signInWithEmail(email: string): Promise<void> {
  const reachability = await probeSupabaseReachable()
  if (!reachability.ok) {
    throw new Error(
      reachability.reason === 'not_configured'
        ? '尚未設定 Supabase'
        : 'SUPABASE_UNREACHABLE',
    )
  }

  const supabase = await requireClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: getAuthRedirectTo(),
      shouldCreateUser: true,
    },
  })
  if (error) throw error
}

export async function verifyEmailOtp(email: string, token: string): Promise<void> {
  const supabase = await requireClient()
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email',
  })
  if (error) throw error
}

export async function signInWithOAuth(provider: 'google'): Promise<void> {
  const supabase = await requireClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getAuthRedirectTo(),
      skipBrowserRedirect: false,
    },
  })
  if (error) throw error
}

export async function completeAuthFromUrl(): Promise<{ email: string | null }> {
  const supabase = await requireClient()
  const existing = await getCloudSession()
  if (existing.session) {
    window.history.replaceState({}, '', '/')
    return { email: existing.user?.email ?? null }
  }

  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const tokenHash = search.get('token_hash') || hash.get('token_hash')
  const type = (search.get('type') || hash.get('type') || 'email') as
    | 'email'
    | 'magiclink'
    | 'signup'
    | 'invite'
    | 'recovery'
  const code = search.get('code')

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type === 'magiclink' ? 'email' : type,
    })
    if (error) throw error
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
  }

  const { session, user } = await getCloudSession()
  window.history.replaceState({}, '', '/')
  if (!session) throw new Error('AUTH_CALLBACK_FAILED')
  return { email: user?.email ?? null }
}

export function subscribeCloudAuth(onUserId: (userId: string | null) => void): () => void {
  let unsubscribe: (() => void) | undefined
  void getSupabaseClient().then((supabase) => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      onUserId(session?.user?.id ?? null)
    })
    unsubscribe = () => data.subscription.unsubscribe()
  })
  return () => unsubscribe?.()
}

async function requireUser() {
  const { user } = await getCloudSession()
  if (!user) throw new Error('請先登入')
  return user
}

export async function signOutCloud(): Promise<void> {
  const supabase = await requireClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

async function createGroupKey(groupCode: string): Promise<string> {
  const normalizedCode = groupCode.trim().toLowerCase()
  if (normalizedCode.length < 8) {
    throw new Error('群組碼至少需要 8 個字元')
  }

  const input = new TextEncoder().encode(`opcg-tracker-group:${normalizedCode}`)
  const digest = await crypto.subtle.digest('SHA-256', input)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function resolveGroupKey(groupCode: string): Promise<string> {
  return createGroupKey(groupCode)
}

async function ensureGroupMembership(
  groupCode: string,
): Promise<{ groupKey: string; role: GroupMemberRole }> {
  const supabase = await requireClient()
  const user = await requireUser()
  const groupKey = await createGroupKey(groupCode)

  const { count, error: countError } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_key', groupKey)
  if (countError && countError.code !== '42703') throw countError

  const role: GroupMemberRole = (count ?? 0) === 0 ? 'owner' : 'member'
  const { getAppState } = await import('@/stores/appStore')
  const state = getAppState()
  const displayName =
    state.settings.profileDisplayName?.trim() ||
    user.email?.split('@')[0] ||
    'Member'

  const insertPayload: Record<string, unknown> = {
    group_key: groupKey,
    user_id: user.id,
    display_name: displayName,
  }
  if (!countError) {
    insertPayload.role = role
  }

  const { error } = await supabase.from('group_members').insert(insertPayload)
  if (error && error.code !== '23505') throw error

  const membership = await fetchCurrentGroupMembership(groupCode)
  const resolvedRole = membership?.role ?? role

  await touchGroupRegistry(groupCode, displayName, resolvedRole === 'owner')

  return { groupKey, role: resolvedRole }
}

async function touchGroupRegistry(
  groupCode: string,
  displayName: string,
  isOwner: boolean,
): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) return
  const { user } = await getCloudSession()
  if (!user) return
  const storageCode = groupCode.trim().toLowerCase()
  const groupKey = await createGroupKey(groupCode)
  const { error } = await supabase.rpc('ensure_group_registry', {
    p_group_key: groupKey,
    p_storage_code: storageCode,
    p_display_name: displayName.trim() || storageCode.toUpperCase(),
    p_owner_user_id: isOwner ? user.id : null,
  })
  if (error && error.code !== '42883' && error.code !== 'PGRST202') {
    // Registry RPC optional until v4.18 SQL is applied.
  }
}

export async function fetchCurrentGroupMembership(
  groupCode: string,
): Promise<{ role: GroupMemberRole; bannedAt: string | null } | null> {
  const supabase = await requireClient()
  const user = await requireUser()
  const groupKey = await createGroupKey(groupCode)
  const { data, error } = await supabase
    .from('group_members')
    .select('role, banned_at')
    .eq('group_key', groupKey)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    if (error.code === '42703' || error.code === 'PGRST116') {
      return { role: 'member', bannedAt: null }
    }
    throw error
  }
  if (!data) return null
  const raw = data.role
  const role: GroupMemberRole =
    raw === 'owner' || raw === 'admin' || raw === 'member' || raw === 'reader' ? raw : 'member'
  return { role, bannedAt: (data.banned_at as string | null) ?? null }
}

export async function fetchGroupMemberRole(groupCode: string): Promise<GroupMemberRole | null> {
  const membership = await fetchCurrentGroupMembership(groupCode)
  return membership?.role ?? null
}

export async function listGroupMembers(groupCode: string): Promise<GroupMemberRecord[]> {
  const supabase = await requireClient()
  const groupKey = await createGroupKey(groupCode)

  const mapRows = (
    rows: Record<string, unknown>[],
    options?: { includeRole?: boolean; includeDisplayName?: boolean; includeBannedAt?: boolean },
  ): GroupMemberRecord[] =>
    rows.map((row) => ({
      userId: row.user_id as string,
      role: (options?.includeRole === false
        ? 'member'
        : row.role === 'owner' || row.role === 'admin' || row.role === 'member' || row.role === 'reader'
          ? row.role
          : 'member') as GroupMemberRole,
      displayName:
        options?.includeDisplayName === false ? null : ((row.display_name as string | null) ?? null),
      joinedAt: (row.joined_at as string) ?? new Date().toISOString(),
      bannedAt:
        options?.includeBannedAt === false ? null : ((row.banned_at as string | null) ?? null),
    }))

  const full = await supabase
    .from('group_members')
    .select('user_id, role, display_name, joined_at, banned_at')
    .eq('group_key', groupKey)
    .order('joined_at', { ascending: true })

  if (!full.error) {
    return mapRows((full.data ?? []) as Record<string, unknown>[])
  }

  if (full.error.code === '42703') {
    const legacy = await supabase
      .from('group_members')
      .select('user_id, display_name, joined_at, banned_at')
      .eq('group_key', groupKey)
      .order('joined_at', { ascending: true })
    if (!legacy.error) {
      return mapRows((legacy.data ?? []) as Record<string, unknown>[], { includeRole: false })
    }
    if (legacy.error.code === '42703') {
      const minimal = await supabase
        .from('group_members')
        .select('user_id, joined_at')
        .eq('group_key', groupKey)
        .order('joined_at', { ascending: true })
      if (minimal.error) throw minimal.error
      return mapRows((minimal.data ?? []) as Record<string, unknown>[], {
        includeRole: false,
        includeDisplayName: false,
        includeBannedAt: false,
      })
    }
    throw legacy.error
  }

  throw full.error
}

export async function updateGroupMemberRole(
  groupCode: string,
  userId: string,
  role: GroupMemberRole,
): Promise<void> {
  const supabase = await requireClient()
  const self = await requireUser()
  if (userId === self.id) throw new Error('無法變更自己的角色')
  if (role === 'owner') throw new Error('無法透過此介面轉移群主')
  const groupKey = await createGroupKey(groupCode)
  const { error } = await supabase
    .from('group_members')
    .update({ role })
    .eq('group_key', groupKey)
    .eq('user_id', userId)
  if (error) throw error
}

export async function setGroupMemberBan(
  groupCode: string,
  userId: string,
  banned: boolean,
): Promise<void> {
  const supabase = await requireClient()
  const self = await requireUser()
  if (userId === self.id) throw new Error('無法封禁自己')
  const groupKey = await createGroupKey(groupCode)
  const { error } = await supabase
    .from('group_members')
    .update({ banned_at: banned ? new Date().toISOString() : null })
    .eq('group_key', groupKey)
    .eq('user_id', userId)
  if (error) throw error
}

export async function removeGroupMember(groupCode: string, userId: string): Promise<void> {
  const supabase = await requireClient()
  const self = await requireUser()
  if (userId === self.id) throw new Error('無法移除自己')
  const groupKey = await createGroupKey(groupCode)
  const { error } = await supabase.rpc('kick_group_member', {
    p_group_key: groupKey,
    p_user_id: userId,
  })
  if (!error) return
  if (error.code !== '42883' && error.code !== 'PGRST202') throw error
  const { error: deleteError } = await supabase
    .from('group_members')
    .delete()
    .eq('group_key', groupKey)
    .eq('user_id', userId)
  if (deleteError) throw deleteError
  await supabase
    .from('sync_players')
    .update({ linked_user_id: null, updated_at: new Date().toISOString(), updated_by: self.id })
    .eq('group_key', groupKey)
    .eq('linked_user_id', userId)
}

export async function adminUnlinkCloudPlayer(groupCode: string, playerId: string): Promise<void> {
  const supabase = await requireClient()
  const groupKey = await createGroupKey(groupCode)
  const { error } = await supabase.rpc('admin_unlink_player', {
    p_group_key: groupKey,
    p_player_id: playerId,
  })
  if (!error) return
  if (error.code !== '42883' && error.code !== 'PGRST202') throw error
  const user = await requireUser()
  const { error: updateError } = await supabase
    .from('sync_players')
    .update({ linked_user_id: null, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq('group_key', groupKey)
    .eq('id', playerId)
  if (updateError) throw updateError
}

export async function updateOwnMemberDisplayName(
  groupCode: string,
  displayName: string,
): Promise<void> {
  const supabase = await requireClient()
  const user = await requireUser()
  const groupKey = await createGroupKey(groupCode)
  const trimmed = displayName.trim()
  if (!trimmed) return
  const { error } = await supabase
    .from('group_members')
    .update({ display_name: trimmed })
    .eq('group_key', groupKey)
    .eq('user_id', user.id)
  if (error && error.code !== '42703') throw error
}

export async function leaveGroupMembership(groupCode: string): Promise<void> {
  const supabase = await requireClient()
  const user = await requireUser()
  const groupKey = await createGroupKey(groupCode)
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_key', groupKey)
    .eq('user_id', user.id)
  if (error) throw error
}

export async function joinGroupLegacy(
  groupCode: string,
): Promise<{ groupKey: string; role: GroupMemberRole }> {
  return ensureGroupMembership(groupCode)
}

export async function joinGroupWithRole(
  groupCode: string,
  options?: { message?: string; inviteToken?: string },
): Promise<{ groupKey: string; role: GroupMemberRole }> {
  const { joinGroupWithPolicy } = await import('@/lib/groupLobby')
  const result = await joinGroupWithPolicy(groupCode, options)
  if (!result.ok) {
    throw new Error(result.error ?? '加入群組失敗')
  }
  if (result.pending) {
    throw new Error('join_pending')
  }
  if (!result.joined || !result.storageCode) {
    throw new Error('加入群組失敗')
  }
  const groupKey = await createGroupKey(result.storageCode)
  return { groupKey, role: result.role ?? 'member' }
}

async function ensureGroupMembershipLegacy(groupCode: string): Promise<string> {
  const { groupKey } = await ensureGroupMembership(groupCode)
  return groupKey
}

export async function uploadCloudSnapshot(state: AppState, deviceLabel: string): Promise<void> {
  const supabase = await requireClient()
  const user = await requireUser()

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
  const groupKey = await ensureGroupMembershipLegacy(groupCode)
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
  const user = await requireUser()

  const groupKey = await ensureGroupMembershipLegacy(groupCode)
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

  const { error: snapshotError } = await supabase.from('group_app_state_snapshots').insert({
    group_key: groupKey,
    state,
    schema_version: SCHEMA_VERSION,
    app_version: APP_VERSION,
    device_label: deviceLabel.trim() || 'Unknown device',
    updated_by: user.id,
  })
  if (snapshotError && snapshotError.code !== '42P01') throw snapshotError
}

export async function loadLatestCloudSnapshot(): Promise<CloudSnapshotRow | null> {
  const supabase = await requireClient()
  const user = await requireUser()

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

export async function listCloudSnapshots(limit = 20): Promise<CloudSnapshotMeta[]> {
  const supabase = await requireClient()
  const user = await requireUser()

  const { data, error } = await supabase
    .from('app_state_snapshots')
    .select('id, schema_version, app_version, device_label, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as CloudSnapshotMeta[]
}

export async function loadCloudSnapshotById(id: string): Promise<CloudSnapshotRow | null> {
  const supabase = await requireClient()
  const user = await requireUser()

  const { data, error } = await supabase
    .from('app_state_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as CloudSnapshotRow | null
}

export async function listGroupCloudSnapshots(
  groupCode: string,
  limit = 20,
): Promise<GroupCloudSnapshotMeta[]> {
  const supabase = await requireClient()
  const groupKey = await ensureGroupMembershipLegacy(groupCode)

  const { data, error } = await supabase
    .from('group_app_state_snapshots')
    .select('id, schema_version, app_version, device_label, created_at')
    .eq('group_key', groupKey)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (error.code === '42P01') return []
    throw error
  }
  return (data ?? []) as GroupCloudSnapshotMeta[]
}

export async function loadGroupCloudSnapshotById(
  groupCode: string,
  id: string,
): Promise<GroupCloudSnapshotRow | null> {
  const supabase = await requireClient()
  const groupKey = await ensureGroupMembershipLegacy(groupCode)

  const { data, error } = await supabase
    .from('group_app_state_snapshots')
    .select('*')
    .eq('group_key', groupKey)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    if (error.code === '42P01') return null
    throw error
  }
  return data as GroupCloudSnapshotRow | null
}
