/** Group roles — stored on Supabase group_members.role and cached in settings.groupMemberRole. */
export type GroupMemberRole = 'owner' | 'admin' | 'member' | 'reader'

export const GROUP_MEMBER_ROLES: GroupMemberRole[] = ['owner', 'admin', 'member']

export function normalizeGroupMemberRole(value: unknown): GroupMemberRole {
  if (value === 'owner' || value === 'admin' || value === 'member' || value === 'reader') return value
  return 'member'
}

/** Legacy groups without role column behave as member (can record, cannot delete). */
export function canRecordMatches(role: GroupMemberRole | null | undefined): boolean {
  if (!role) return true
  return role === 'owner' || role === 'admin' || role === 'member'
}

export function canDeleteMatches(
  role: GroupMemberRole | null | undefined,
  inGroup: boolean,
): boolean {
  if (!inGroup) return true
  return role === 'owner' || role === 'admin'
}

export function canManageGroup(role: GroupMemberRole | null | undefined): boolean {
  return role === 'owner' || role === 'admin'
}

export function canTransferOwnership(role: GroupMemberRole | null | undefined): boolean {
  return role === 'owner'
}

export function canManageMembers(role: GroupMemberRole | null | undefined, banned?: boolean): boolean {
  if (banned) return false
  return role === 'owner' || role === 'admin'
}

export function isBannedFromGroup(bannedAt: string | null | undefined): boolean {
  return Boolean(bannedAt)
}

/** Effective record permission — banned overrides role. */
export function canRecordMatchesEffective(
  role: GroupMemberRole | null | undefined,
  bannedAt: string | null | undefined,
): boolean {
  if (isBannedFromGroup(bannedAt)) return false
  return canRecordMatches(role)
}

/** @deprecated V5: public visibility replaces reader role. Kept for legacy rows. */
export function isReadOnlyMember(role: GroupMemberRole | null | undefined): boolean {
  return role === 'reader'
}

export function groupRoleLabelKey(role: GroupMemberRole): import('@/lib/i18n').TranslationKey {
  switch (role) {
    case 'owner':
      return 'groupRole.owner'
    case 'admin':
      return 'groupRole.admin'
    case 'member':
      return 'groupRole.member'
    case 'reader':
      return 'groupRole.member'
  }
}

export function groupRoleLabel(role: GroupMemberRole): string {
  switch (role) {
    case 'owner':
      return '群主'
    case 'admin':
      return '管理員'
    case 'member':
      return '玩家'
    case 'reader':
      return '玩家'
  }
}
