import { getCloudSession, getSupabaseClient, resolveGroupKey } from '@/lib/cloudSync'
import {
  compactGroupLookupTerm,
  ensureGroupRegistryOnJoin,
  expandGroupLookupTerms,
  isValidInviteSlug,
  normalizeGroupLookupTerm,
  normalizeInviteSlug,
  normalizeStorageCode,
} from '@/lib/groupRegistry'
import type { GroupMemberRole } from '@/lib/groupPermissions'

export type GroupVisibility = 'public' | 'unlisted' | 'private'
export type GroupJoinPolicy = 'open' | 'request' | 'invite_only'
export type GroupJoinStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'member'

export interface GroupLobbyStats {
  players: number
  matches: number
  sessions: number
  lastActiveAt: string | null
}

export interface PublicGroupCard {
  groupKey: string
  storageCode: string
  publicId: string
  displayName: string
  inviteSlug: string | null
  visibility: GroupVisibility
  joinPolicy: GroupJoinPolicy
  description: string | null
  stats: GroupLobbyStats
  isMember: boolean
  joinStatus: GroupJoinStatus
}

export interface GroupJoinRequest {
  id: string
  userId: string
  displayName: string
  message: string | null
  status: string
  createdAt: string
}

export interface JoinGroupResult {
  ok: boolean
  joined?: boolean
  pending?: boolean
  storageCode?: string
  role?: GroupMemberRole
  error?: string
  requestId?: string
}

type RawGroupRow = Record<string, unknown>

const GROUP_SELECT =
  'group_key, display_name, public_id, invite_slug, visibility, join_policy, description, stats_snapshot, last_active_at, settings'

function parseStats(raw: unknown): GroupLobbyStats {
  const snapshot = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    players: Number(snapshot.players ?? 0) || 0,
    matches: Number(snapshot.matches ?? 0) || 0,
    sessions: Number(snapshot.sessions ?? 0) || 0,
    lastActiveAt: typeof snapshot.lastActiveAt === 'string' ? snapshot.lastActiveAt : null,
  }
}

function parseVisibility(raw: unknown): GroupVisibility {
  return raw === 'unlisted' || raw === 'private' ? raw : 'public'
}

function parseJoinPolicy(raw: unknown): GroupJoinPolicy {
  return raw === 'open' || raw === 'invite_only' ? raw : 'request'
}

function parseJoinStatus(raw: unknown, isMember: boolean): GroupJoinStatus {
  if (isMember) return 'member'
  if (raw === 'pending' || raw === 'approved' || raw === 'rejected') return raw
  return 'none'
}

function storageCodeFromRow(row: RawGroupRow): string {
  const settings = (row.settings as { storage_code?: string } | null) ?? {}
  return String(settings.storage_code ?? '').trim()
}

function mapPublicGroupRow(row: RawGroupRow): PublicGroupCard {
  const isMember = Boolean(row.is_member)
  const storageCode = String(row.storage_code ?? storageCodeFromRow(row))
  return {
    groupKey: String(row.group_key ?? ''),
    storageCode,
    publicId: String(row.public_id ?? storageCode),
    displayName: String(row.display_name ?? ''),
    inviteSlug: (row.invite_slug as string | null) ?? null,
    visibility: parseVisibility(row.visibility),
    joinPolicy: parseJoinPolicy(row.join_policy),
    description: (row.description as string | null) ?? null,
    stats: parseStats(row.stats_snapshot),
    isMember,
    joinStatus: parseJoinStatus(row.join_status, isMember),
  }
}

function isRpcMissing(error: { code?: string } | null): boolean {
  return error?.code === '42883' || error?.code === 'PGRST202'
}

function groupRowMatchesLookup(row: RawGroupRow, lookup: string): boolean {
  const terms = expandGroupLookupTerms(lookup)
  const compactTerms = terms.map(compactGroupLookupTerm).filter(Boolean)
  const fields = [
    String(row.public_id ?? ''),
    String(row.invite_slug ?? ''),
    storageCodeFromRow(row),
    String(row.display_name ?? ''),
  ]

  for (const term of terms) {
    for (const field of fields) {
      const normalized = normalizeGroupLookupTerm(field)
      if (!normalized) continue
      if (normalized === term || normalized.includes(term) || term.includes(normalized)) {
        return true
      }
    }
  }

  const compactFields = fields.map(compactGroupLookupTerm).filter(Boolean)
  for (const term of compactTerms) {
    if (term.length < 4) continue
    for (const field of compactFields) {
      if (field === term || field.endsWith(term) || term.endsWith(field)) {
        return true
      }
    }
  }

  return false
}

function canDiscoverGroup(row: RawGroupRow, isMember: boolean): boolean {
  if (isMember) return true
  const visibility = parseVisibility(row.visibility)
  return visibility === 'public' || visibility === 'unlisted'
}

async function enrichPublicGroupRows(rows: RawGroupRow[]): Promise<PublicGroupCard[]> {
  const supabase = await getSupabaseClient()
  const { user } = await getCloudSession()
  if (!supabase || !user || rows.length === 0) {
    return rows.map((row) => mapPublicGroupRow(row))
  }

  const groupKeys = rows.map((row) => String(row.group_key ?? '')).filter(Boolean)
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_key')
    .eq('user_id', user.id)
    .in('group_key', groupKeys)

  const memberKeys = new Set((memberships ?? []).map((row) => String(row.group_key)))
  return rows.map((row) =>
    mapPublicGroupRow({
      ...row,
      storage_code: row.storage_code ?? storageCodeFromRow(row),
      is_member: memberKeys.has(String(row.group_key ?? '')),
      join_status: memberKeys.has(String(row.group_key ?? '')) ? 'member' : 'none',
    }),
  )
}

async function fetchPublicGroupsDirect(options?: {
  query?: string
  sort?: 'active' | 'matches' | 'players'
  limit?: number
}): Promise<PublicGroupCard[]> {
  const supabase = await getSupabaseClient()
  if (!supabase) return []
  const { user } = await getCloudSession()
  if (!user) return []

  const { data, error } = await supabase.from('groups').select(GROUP_SELECT).eq('visibility', 'public')
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return []
    throw error
  }

  const query = options?.query?.trim() ?? ''
  let rows = (data ?? []) as RawGroupRow[]
  if (query) {
    rows = rows.filter((row) => groupRowMatchesLookup(row, query))
  }

  const sort = options?.sort ?? 'active'
  rows.sort((left, right) => {
    if (sort === 'matches') {
      return parseStats(right.stats_snapshot).matches - parseStats(left.stats_snapshot).matches
    }
    if (sort === 'players') {
      return parseStats(right.stats_snapshot).players - parseStats(left.stats_snapshot).players
    }
    const rightTime = new Date(String(right.last_active_at ?? 0)).getTime()
    const leftTime = new Date(String(left.last_active_at ?? 0)).getTime()
    return rightTime - leftTime
  })

  const limit = options?.limit ?? 24
  return enrichPublicGroupRows(rows.slice(0, limit))
}

async function resolveGroupLookupDirect(lookup: string): Promise<PublicGroupCard | null> {
  const supabase = await getSupabaseClient()
  if (!supabase) return null
  const { user } = await getCloudSession()
  if (!user) return null

  const { data, error } = await supabase.from('groups').select(GROUP_SELECT)
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return null
    throw error
  }

  const rows = (data ?? []) as RawGroupRow[]
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_key')
    .eq('user_id', user.id)

  const memberKeys = new Set((memberships ?? []).map((row) => String(row.group_key)))
  const match = rows.find((row) => {
    const isMember = memberKeys.has(String(row.group_key ?? ''))
    return groupRowMatchesLookup(row, lookup) && canDiscoverGroup(row, isMember)
  })

  if (!match) return null
  return mapPublicGroupRow({
    ...match,
    storage_code: storageCodeFromRow(match),
    is_member: memberKeys.has(String(match.group_key ?? '')),
    join_status: memberKeys.has(String(match.group_key ?? '')) ? 'member' : 'none',
  })
}

export async function searchPublicGroups(options?: {
  query?: string
  sort?: 'active' | 'matches' | 'players'
  limit?: number
  offset?: number
}): Promise<PublicGroupCard[]> {
  const supabase = await getSupabaseClient()
  if (!supabase) return []
  const { user } = await getCloudSession()
  if (!user) return []

  const query = options?.query?.trim() ?? ''
  const { data, error } = await supabase.rpc('search_public_groups', {
    p_query: query,
    p_sort: options?.sort ?? 'active',
    p_limit: options?.limit ?? 24,
    p_offset: options?.offset ?? 0,
  })
  if (error) {
    if (isRpcMissing(error)) {
      return fetchPublicGroupsDirect({
        query,
        sort: options?.sort,
        limit: options?.limit,
      })
    }
    throw error
  }

  const rows = (data ?? []).map((row: RawGroupRow) => mapPublicGroupRow(row))
  if (rows.length || !query) return rows

  return fetchPublicGroupsDirect({
    query,
    sort: options?.sort,
    limit: options?.limit,
  })
}

export async function resolveGroupLookup(lookup: string): Promise<PublicGroupCard | null> {
  const supabase = await getSupabaseClient()
  if (!supabase) return null
  const { user } = await getCloudSession()
  if (!user) return null

  const trimmed = lookup.trim()
  if (!trimmed) return null

  const terms = expandGroupLookupTerms(trimmed)
  for (const term of terms) {
    const { data, error } = await supabase.rpc('resolve_group_lookup', { p_lookup: term })
    if (error) {
      if (isRpcMissing(error)) {
        return resolveGroupLookupDirect(trimmed)
      }
      throw error
    }
    const row = Array.isArray(data) ? data[0] : data
    if (row) return mapPublicGroupRow(row as RawGroupRow)
  }

  return resolveGroupLookupDirect(trimmed)
}

export async function joinGroupWithPolicy(
  lookup: string,
  options?: { message?: string; inviteToken?: string },
): Promise<JoinGroupResult> {
  const supabase = await getSupabaseClient()
  if (!supabase) throw new Error('尚未設定 Supabase')
  const { user } = await getCloudSession()
  if (!user) throw new Error('請先登入')

  const terms = expandGroupLookupTerms(lookup)
  let lastError: { code?: string } | null = null
  for (const term of terms) {
    const { data, error } = await supabase.rpc('join_group_with_policy', {
      p_lookup: term,
      p_message: options?.message?.trim() || null,
      p_invite_token: options?.inviteToken?.trim() || null,
    })
    if (error) {
      lastError = error
      if (!isRpcMissing(error)) throw error
      break
    }

    const result = (data ?? {}) as Record<string, unknown>
    if (!result.ok) {
      if (result.error === 'not_found') continue
      return { ok: false, error: String(result.error ?? 'join_failed') }
    }

    const storageCode = String(result.storageCode ?? normalizeStorageCode(lookup))
    const role = (result.role === 'owner' || result.role === 'admin' || result.role === 'member'
      ? result.role
      : 'member') as GroupMemberRole

    if (result.joined) {
      await ensureGroupRegistryOnJoin(storageCode, { isOwner: role === 'owner' })
    }

    return {
      ok: true,
      joined: Boolean(result.joined),
      pending: Boolean(result.pending),
      storageCode,
      role: result.joined ? role : undefined,
      requestId: result.requestId ? String(result.requestId) : undefined,
    }
  }

  if (lastError && isRpcMissing(lastError)) {
    const { joinGroupLegacy } = await import('@/lib/cloudSync')
    const legacy = await joinGroupLegacy(normalizeStorageCode(lookup))
    return { ok: true, joined: true, storageCode: lookup.trim().toLowerCase(), role: legacy.role }
  }

  return { ok: false, error: 'not_found' }
}

export async function listGroupJoinRequests(groupCode: string): Promise<GroupJoinRequest[]> {
  const supabase = await getSupabaseClient()
  if (!supabase) return []
  const groupKey = await resolveGroupKey(groupCode)
  const { data, error } = await supabase.rpc('list_group_join_requests', { p_group_key: groupKey })
  if (error) {
    if (isRpcMissing(error)) return []
    throw error
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    userId: String(row.user_id),
    displayName: String(row.display_name ?? 'User'),
    message: (row.message as string | null) ?? null,
    status: String(row.status ?? 'pending'),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }))
}

export async function reviewJoinRequest(
  requestId: string,
  approve: boolean,
  note?: string,
): Promise<JoinGroupResult> {
  const supabase = await getSupabaseClient()
  if (!supabase) throw new Error('尚未設定 Supabase')
  const { data, error } = await supabase.rpc('review_join_request', {
    p_request_id: requestId,
    p_approve: approve,
    p_note: note?.trim() || null,
  })
  if (error) throw error
  const result = (data ?? {}) as Record<string, unknown>
  if (!result.ok) return { ok: false, error: String(result.error ?? 'review_failed') }
  return {
    ok: true,
    joined: Boolean(result.approved),
    storageCode: result.storageCode ? String(result.storageCode) : undefined,
    role: (result.role as GroupMemberRole | undefined) ?? undefined,
  }
}

export async function transferGroupOwnership(
  groupCode: string,
  newOwnerUserId: string,
): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) throw new Error('尚未設定 Supabase')
  const groupKey = await resolveGroupKey(groupCode)
  const { error } = await supabase.rpc('transfer_group_ownership', {
    p_group_key: groupKey,
    p_new_owner_user_id: newOwnerUserId,
  })
  if (error) throw error
}

export async function updateGroupLobbySettings(
  groupCode: string,
  patch: {
    displayName?: string
    publicId?: string | null
    inviteSlug?: string | null
    description?: string | null
    visibility?: GroupVisibility
    joinPolicy?: GroupJoinPolicy
  },
): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) throw new Error('尚未設定 Supabase')
  const groupKey = await resolveGroupKey(groupCode)

  await ensureGroupRegistryOnJoin(groupCode, {
    isOwner: true,
    displayName: patch.displayName,
  })

  let normalizedSlug: string | null | undefined = patch.inviteSlug
  if (patch.inviteSlug !== undefined && patch.inviteSlug !== null && patch.inviteSlug !== '') {
    const slug = normalizeInviteSlug(patch.inviteSlug)
    if (!isValidInviteSlug(slug)) throw new Error('邀請代碼格式不正確')
    normalizedSlug = slug
  }

  const normalizedPublicId =
    patch.publicId !== undefined && patch.publicId !== null
      ? normalizeGroupLookupTerm(patch.publicId) || null
      : patch.publicId

  const { error } = await supabase.rpc('update_group_lobby_settings', {
    p_group_key: groupKey,
    p_display_name: patch.displayName ?? null,
    p_public_id: normalizedPublicId ?? null,
    p_invite_slug: normalizedSlug ?? null,
    p_description: patch.description ?? null,
    p_visibility: patch.visibility ?? null,
    p_join_policy: patch.joinPolicy ?? null,
  })
  if (error) {
    if (isRpcMissing(error)) {
      const { updateGroupRegistry } = await import('@/lib/groupRegistry')
      await updateGroupRegistry(groupCode, {
        displayName: patch.displayName,
        inviteSlug: patch.inviteSlug,
      })
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      if (normalizedPublicId !== undefined) payload.public_id = normalizedPublicId
      if (patch.visibility !== undefined) payload.visibility = patch.visibility
      if (patch.joinPolicy !== undefined) payload.join_policy = patch.joinPolicy
      if (patch.description !== undefined) payload.description = patch.description || null
      if (patch.visibility === 'public') payload.last_active_at = new Date().toISOString()
      const { error: updateError } = await supabase.from('groups').update(payload).eq('group_key', groupKey)
      if (updateError) throw updateError
      return
    }
    throw error
  }
}

export async function createGroupInviteLink(
  groupCode: string,
  options?: { expiresHours?: number; maxUses?: number | null },
): Promise<string> {
  const supabase = await getSupabaseClient()
  if (!supabase) throw new Error('尚未設定 Supabase')
  const groupKey = await resolveGroupKey(groupCode)
  const { data, error } = await supabase.rpc('create_group_invite_link', {
    p_group_key: groupKey,
    p_expires_hours: options?.expiresHours ?? 168,
    p_max_uses: options?.maxUses ?? null,
  })
  if (error) throw error
  return String(data ?? '')
}

export async function refreshGroupStatsSnapshot(groupCode: string): Promise<GroupLobbyStats | null> {
  const supabase = await getSupabaseClient()
  if (!supabase) return null
  const groupKey = await resolveGroupKey(groupCode)
  const { data, error } = await supabase.rpc('refresh_group_stats_snapshot', { p_group_key: groupKey })
  if (error) {
    if (isRpcMissing(error)) return null
    throw error
  }
  return parseStats(data)
}

export function joinPolicyLabelKey(policy: GroupJoinPolicy): import('@/lib/i18n').TranslationKey {
  switch (policy) {
    case 'open':
      return 'lobby.policyOpen'
    case 'invite_only':
      return 'lobby.policyInviteOnly'
    default:
      return 'lobby.policyRequest'
  }
}

export function visibilityLabelKey(visibility: GroupVisibility): import('@/lib/i18n').TranslationKey {
  switch (visibility) {
    case 'unlisted':
      return 'lobby.visibilityUnlisted'
    case 'private':
      return 'lobby.visibilityPrivate'
    default:
      return 'lobby.visibilityPublic'
  }
}
