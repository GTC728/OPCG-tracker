/** Group roles — stored on Supabase group_members.role and cached in settings.groupMemberRole. */
export type GroupMemberRole = 'owner' | 'member' | 'reader'

export const GROUP_MEMBER_ROLES: GroupMemberRole[] = ['owner', 'member', 'reader']

export function normalizeGroupMemberRole(value: unknown): GroupMemberRole {
  if (value === 'owner' || value === 'member' || value === 'reader') return value
  return 'member'
}

/** Legacy groups without role column behave as member (can record, cannot delete). */
export function canRecordMatches(role: GroupMemberRole | null | undefined): boolean {
  if (!role) return true
  return role === 'owner' || role === 'member'
}

export function canDeleteMatches(
  role: GroupMemberRole | null | undefined,
  inGroup: boolean,
): boolean {
  if (!inGroup) return true
  return role === 'owner'
}

export function canManageGroup(role: GroupMemberRole | null | undefined): boolean {
  return role === 'owner'
}

export function canManageMembers(role: GroupMemberRole | null | undefined, banned?: boolean): boolean {
  if (banned) return false
  return role === 'owner'
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

export function isReadOnlyMember(role: GroupMemberRole | null | undefined): boolean {
  return role === 'reader'
}

export function groupRoleLabelKey(role: GroupMemberRole): import('@/lib/i18n').TranslationKey {
  switch (role) {
    case 'owner':
      return 'groupRole.owner'
    case 'member':
      return 'groupRole.member'
    case 'reader':
      return 'groupRole.reader'
  }
}

export function groupRoleLabel(role: GroupMemberRole): string {
  switch (role) {
    case 'owner':
      return '管理員'
    case 'member':
      return '記錄者'
    case 'reader':
      return '觀看者'
  }
}
