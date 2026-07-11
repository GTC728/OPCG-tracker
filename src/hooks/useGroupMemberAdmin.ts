import { useCallback, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
  canManageMembers,
  isBannedFromGroup,
  type GroupMemberRole,
} from '@/lib/groupPermissions'
import { resolveMemberDisplayName } from '@/lib/memberDisplay'
import {
  listGroupMembers,
  removeGroupMember,
  setGroupMemberBan,
  updateGroupMemberRole,
  updateOwnMemberDisplayName,
} from '@/lib/cloudSync'
import { useI18n } from '@/lib/i18n'
import type { GroupMemberRecord } from '@/types'
import { useAppStore } from '@/stores/appStore'

export function useGroupMemberAdmin(onMembersChange?: (members: GroupMemberRecord[]) => void) {
  const { t } = useI18n()
  const toast = useToast()
  const groupCode = useAppStore((state) => state.settings.lastGroupCode)
  const role = useAppStore((state) => state.settings.groupMemberRole)
  const bannedAt = useAppStore((state) => state.settings.groupMemberBannedAt)
  const profileDisplayName = useAppStore((state) => state.settings.profileDisplayName)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const canManage = Boolean(groupCode) && canManageMembers(role, isBannedFromGroup(bannedAt))

  const reloadMembers = useCallback(async () => {
    if (!groupCode) return []
    const ownName = profileDisplayName?.trim()
    if (ownName) {
      try {
        await updateOwnMemberDisplayName(groupCode, ownName)
      } catch {
        // offline or legacy schema
      }
    }
    const rows = await listGroupMembers(groupCode)
    onMembersChange?.(rows)
    return rows
  }, [groupCode, onMembersChange, profileDisplayName])

  const handleRoleChange = useCallback(
    async (userId: string, nextRole: GroupMemberRole) => {
      if (!groupCode) return
      setBusyUserId(userId)
      try {
        await updateGroupMemberRole(groupCode, userId, nextRole)
        toast.success(t('members.roleUpdated'))
        await reloadMembers()
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : t('members.actionFailed'))
      } finally {
        setBusyUserId(null)
      }
    },
    [groupCode, reloadMembers, t, toast],
  )

  const handleBanToggle = useCallback(
    async (member: GroupMemberRecord) => {
      if (!groupCode) return
      setBusyUserId(member.userId)
      try {
        await setGroupMemberBan(groupCode, member.userId, !member.bannedAt)
        toast.success(member.bannedAt ? t('members.unbanned') : t('members.banned'))
        await reloadMembers()
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : t('members.actionFailed'))
      } finally {
        setBusyUserId(null)
      }
    },
    [groupCode, reloadMembers, t, toast],
  )

  const handleRemove = useCallback(
    async (member: GroupMemberRecord, linkedPlayerName?: string | null) => {
      if (!groupCode) return
      const label = resolveMemberDisplayName(member, linkedPlayerName)
      if (!window.confirm(t('members.kickConfirm').replace('{name}', label))) return
      setBusyUserId(member.userId)
      try {
        await removeGroupMember(groupCode, member.userId)
        toast.success(t('members.removed'))
        await reloadMembers()
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : t('members.actionFailed'))
      } finally {
        setBusyUserId(null)
      }
    },
    [groupCode, reloadMembers, t, toast],
  )

  return {
    canManage,
    busyUserId,
    handleRoleChange,
    handleBanToggle,
    handleRemove,
    reloadMembers,
  }
}
