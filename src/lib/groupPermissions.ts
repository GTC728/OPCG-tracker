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

export function isReadOnlyMember(role: GroupMemberRole | null | undefined): boolean {
  return role === 'reader'
}

export function groupRoleLabel(role: GroupMemberRole): string {
  switch (role) {
    case 'owner':
      return '管理員'
    case 'member':
      return '成員'
    case 'reader':
      return '觀眾'
  }
}
