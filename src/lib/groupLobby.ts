import { getCloudSession, getSupabaseClient, resolveGroupKey } from '@/lib/cloudSync'
import {
  ensureGroupRegistryOnJoin,
  isValidInviteSlug,
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

function mapPublicGroupRow(row: Record<string, unknown>): PublicGroupCard {
  const isMember = Boolean(row.is_member)
  return {
    groupKey: String(row.group_key ?? ''),
    storageCode: String(row.storage_code ?? ''),
    publicId: String(row.public_id ?? row.storage_code ?? ''),
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

  const { data, error } = await supabase.rpc('search_public_groups', {
    p_query: options?.query?.trim() ?? '',
    p_sort: options?.sort ?? 'active',
    p_limit: options?.limit ?? 24,
    p_offset: options?.offset ?? 0,
  })
  if (error) {
    if (isRpcMissing(error)) return []
    throw error
  }
  return (data ?? []).map((row: Record<string, unknown>) => mapPublicGroupRow(row))
}

export async function resolveGroupLookup(lookup: string): Promise<PublicGroupCard | null> {
  const supabase = await getSupabaseClient()
  if (!supabase) return null
  const { user } = await getCloudSession()
  if (!user) return null

  const trimmed = lookup.trim()
  if (!trimmed) return null

  const { data, error } = await supabase.rpc('resolve_group_lookup', { p_lookup: trimmed })
  if (error) {
    if (isRpcMissing(error)) return null
    throw error
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return mapPublicGroupRow(row as Record<string, unknown>)
}

export async function joinGroupWithPolicy(
  lookup: string,
  options?: { message?: string; inviteToken?: string },
): Promise<JoinGroupResult> {
  const supabase = await getSupabaseClient()
  if (!supabase) throw new Error('尚未設定 Supabase')
  const { user } = await getCloudSession()
  if (!user) throw new Error('請先登入')

  const { data, error } = await supabase.rpc('join_group_with_policy', {
    p_lookup: lookup.trim(),
    p_message: options?.message?.trim() || null,
    p_invite_token: options?.inviteToken?.trim() || null,
  })
  if (error) {
    if (isRpcMissing(error)) {
      const { joinGroupLegacy } = await import('@/lib/cloudSync')
      const legacy = await joinGroupLegacy(normalizeStorageCode(lookup))
      return { ok: true, joined: true, storageCode: lookup.trim().toLowerCase(), role: legacy.role }
    }
    throw error
  }

  const result = (data ?? {}) as Record<string, unknown>
  if (!result.ok) {
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

  let normalizedSlug: string | null | undefined = patch.inviteSlug
  if (patch.inviteSlug !== undefined && patch.inviteSlug !== null && patch.inviteSlug !== '') {
    const slug = normalizeInviteSlug(patch.inviteSlug)
    if (!isValidInviteSlug(slug)) throw new Error('邀請代碼格式不正確')
    normalizedSlug = slug
  }

  const { error } = await supabase.rpc('update_group_lobby_settings', {
    p_group_key: groupKey,
    p_display_name: patch.displayName ?? null,
    p_public_id: patch.publicId ?? null,
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
