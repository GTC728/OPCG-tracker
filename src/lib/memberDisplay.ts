import type { GroupMemberRecord } from '@/types'

export function resolveMemberDisplayName(
  member: Pick<GroupMemberRecord, 'displayName' | 'userId'>,
  linkedPlayerName?: string | null,
): string {
  const trimmed = member.displayName?.trim()
  if (trimmed) return trimmed
  const linked = linkedPlayerName?.trim()
  if (linked) return linked
  return `${member.userId.slice(0, 8)}…`
}
