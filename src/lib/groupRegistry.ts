import {
  getCloudSession,
  getSupabaseClient,
  resolveGroupKey,
} from '@/lib/cloudSync'
import type { GroupMemberRole } from '@/lib/groupPermissions'

export interface GroupMembershipSummary {
  groupKey: string
  groupCode: string
  displayName: string
  inviteSlug: string | null
  publicId: string | null
  visibility: import('@/lib/groupLobby').GroupVisibility | null
  joinPolicy: import('@/lib/groupLobby').GroupJoinPolicy | null
  role: GroupMemberRole
  joinedAt: string
}

export interface GroupRegistryProfile {
  groupKey: string
  displayName: string
  inviteSlug: string | null
  storageCode: string
}

const INVITE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/

export function normalizeStorageCode(groupCode: string): string {
  return groupCode.trim().toLowerCase()
}

export function normalizeInviteSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function isValidInviteSlug(value: string): boolean {
  const normalized = normalizeInviteSlug(value)
  return normalized.length >= 3 && INVITE_SLUG_PATTERN.test(normalized)
}

function parseRole(raw: unknown): GroupMemberRole {
  return raw === 'owner' || raw === 'admin' || raw === 'member' || raw === 'reader' ? raw : 'member'
}

export async function listMyGroupMemberships(): Promise<GroupMembershipSummary[]> {
  const supabase = await getSupabaseClient()
  if (!supabase) return []
  const { user } = await getCloudSession()
  if (!user) return []

  const { data, error } = await supabase.rpc('list_my_group_memberships')
  if (error) {
    if (error.code === '42883' || error.code === 'PGRST202') return []
    throw error
  }

  return (data ?? [])
    .map((row: Record<string, unknown>) => {
      const storageCode = String(row.storage_code ?? '').trim()
      if (!storageCode) return null
      const summary: GroupMembershipSummary = {
        groupKey: String(row.group_key),
        groupCode: storageCode,
        displayName: String(row.display_name ?? storageCode.toUpperCase()),
        inviteSlug: (row.invite_slug as string | null) ?? null,
        publicId: (row.public_id as string | null) ?? storageCode,
        visibility: (row.visibility as GroupMembershipSummary['visibility']) ?? null,
        joinPolicy: (row.join_policy as GroupMembershipSummary['joinPolicy']) ?? null,
        role: parseRole(row.role),
        joinedAt: String(row.joined_at ?? new Date().toISOString()),
      }
      return summary
    })
    .filter((item: GroupMembershipSummary | null): item is GroupMembershipSummary => item !== null)
}

export async function ensureGroupRegistryOnJoin(
  groupCode: string,
  options?: { isOwner?: boolean; displayName?: string },
): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) return
  const { user } = await getCloudSession()
  if (!user) return

  const storageCode = normalizeStorageCode(groupCode)
  const groupKey = await resolveGroupKey(groupCode)
  const { error } = await supabase.rpc('ensure_group_registry', {
    p_group_key: groupKey,
    p_storage_code: storageCode,
    p_display_name: options?.displayName?.trim() || storageCode.toUpperCase(),
    p_owner_user_id: options?.isOwner ? user.id : null,
  })
  if (error && error.code !== '42883' && error.code !== 'PGRST202') throw error
}

export async function fetchGroupRegistry(groupCode: string): Promise<GroupRegistryProfile | null> {
  const supabase = await getSupabaseClient()
  if (!supabase) return null
  const groupKey = await resolveGroupKey(groupCode)
  const { data, error } = await supabase
    .from('groups')
    .select('group_key, display_name, invite_slug, settings')
    .eq('group_key', groupKey)
    .maybeSingle()

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return null
    throw error
  }
  if (!data) return null

  const settings = (data.settings as { storage_code?: string } | null) ?? {}
  return {
    groupKey: data.group_key as string,
    displayName: (data.display_name as string) ?? normalizeStorageCode(groupCode).toUpperCase(),
    inviteSlug: (data.invite_slug as string | null) ?? null,
    storageCode: settings.storage_code ?? normalizeStorageCode(groupCode),
  }
}

export async function updateGroupRegistry(
  groupCode: string,
  patch: { displayName?: string; inviteSlug?: string | null },
): Promise<void> {
  const supabase = await getSupabaseClient()
  if (!supabase) throw new Error('尚未設定 Supabase')
  const groupKey = await resolveGroupKey(groupCode)

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (patch.displayName !== undefined) {
    const trimmed = patch.displayName.trim()
    if (!trimmed) throw new Error('群組名稱不可為空')
    payload.display_name = trimmed
  }
  if (patch.inviteSlug !== undefined) {
    if (patch.inviteSlug === null || patch.inviteSlug === '') {
      payload.invite_slug = null
    } else {
      const slug = normalizeInviteSlug(patch.inviteSlug)
      if (!isValidInviteSlug(slug)) {
        throw new Error('邀請代碼需 3–32 字，僅限小寫英數與連字號')
      }
      payload.invite_slug = slug
    }
  }

  const { error } = await supabase.from('groups').update(payload).eq('group_key', groupKey)
  if (error) throw error
}

export async function resolveInviteSlug(
  slug: string,
): Promise<{ groupCode: string; displayName: string } | null> {
  const supabase = await getSupabaseClient()
  if (!supabase) return null
  const normalized = normalizeInviteSlug(slug)
  if (!isValidInviteSlug(normalized)) return null

  const { data, error } = await supabase.rpc('resolve_group_invite_slug', {
    p_slug: normalized,
  })
  if (error) {
    if (error.code === '42883' || error.code === 'PGRST202') return null
    throw error
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  const storageCode = String(row.storage_code ?? '').trim()
  if (!storageCode) return null
  return {
    groupCode: storageCode,
    displayName: String(row.display_name ?? storageCode.toUpperCase()),
  }
}
