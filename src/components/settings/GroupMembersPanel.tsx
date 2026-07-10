import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { OptionPickerSheet } from '@/components/ui/FilterPicker'
import { useToast } from '@/components/ui/Toast'
import {
  canManageMembers,
  groupRoleLabel,
  isBannedFromGroup,
  type GroupMemberRole,
} from '@/lib/groupPermissions'
import {
  getCloudSession,
  isCloudConfigured,
  listGroupMembers,
  removeGroupMember,
  setGroupMemberBan,
  updateGroupMemberRole,
} from '@/lib/cloudSync'
import { useI18n } from '@/lib/i18n'
import type { GroupMemberRecord } from '@/types'
import { useAppStore } from '@/stores/appStore'

function memberLabel(member: GroupMemberRecord): string {
  if (member.displayName?.trim()) return member.displayName.trim()
  return `${member.userId.slice(0, 8)}…`
}

export function GroupMembersPanel() {
  const { t } = useI18n()
  const toast = useToast()
  const groupCode = useAppStore((state) => state.settings.lastGroupCode)
  const role = useAppStore((state) => state.settings.groupMemberRole)
  const bannedAt = useAppStore((state) => state.settings.groupMemberBannedAt)
  const cloudUserId = useAppStore((state) => state.settings.cloudUserId)
  const players = useAppStore((state) => state.players)
  const [members, setMembers] = useState<GroupMemberRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const [rolePickerUserId, setRolePickerUserId] = useState<string | null>(null)

  const canManage = Boolean(groupCode) && canManageMembers(role, isBannedFromGroup(bannedAt))
  const configured = isCloudConfigured()

  const linkedPlayerByUserId = useMemo(() => {
    const map = new Map<string, string>()
    for (const player of players) {
      if (player.linkedUserId && !player.deletedAt) {
        map.set(player.linkedUserId, player.name)
      }
    }
    return map
  }, [players])

  const refresh = useCallback(async () => {
    if (!groupCode || !configured) return
    setLoading(true)
    try {
      const { user } = await getCloudSession()
      if (!user) {
        setMembers([])
        return
      }
      const rows = await listGroupMembers(groupCode)
      setMembers(rows)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('members.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [configured, groupCode, t, toast])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (!groupCode) {
    return (
      <section className="rounded-2xl bg-surface-elevated p-4 text-sm text-text-secondary">
        {t('members.notInGroup')}
      </section>
    )
  }

  if (!configured) {
    return (
      <section className="rounded-2xl bg-surface-elevated p-4 text-sm text-text-secondary">
        {t('cloud.notConfigured')}
      </section>
    )
  }

  const handleRoleChange = async (userId: string, nextRole: GroupMemberRole) => {
    if (!groupCode) return
    setBusyUserId(userId)
    try {
      await updateGroupMemberRole(groupCode, userId, nextRole)
      toast.success(t('members.roleUpdated'))
      await refresh()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('members.actionFailed'))
    } finally {
      setBusyUserId(null)
      setRolePickerUserId(null)
    }
  }

  const handleBanToggle = async (member: GroupMemberRecord) => {
    if (!groupCode) return
    setBusyUserId(member.userId)
    try {
      await setGroupMemberBan(groupCode, member.userId, !member.bannedAt)
      toast.success(member.bannedAt ? t('members.unbanned') : t('members.banned'))
      await refresh()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('members.actionFailed'))
    } finally {
      setBusyUserId(null)
    }
  }

  const handleRemove = async (member: GroupMemberRecord) => {
    if (!groupCode) return
    if (!window.confirm(t('members.kickConfirm').replace('{name}', memberLabel(member)))) return
    setBusyUserId(member.userId)
    try {
      await removeGroupMember(groupCode, member.userId)
      toast.success(t('members.removed'))
      await refresh()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('members.actionFailed'))
    } finally {
      setBusyUserId(null)
    }
  }

  const rolePickerMember = members.find((item) => item.userId === rolePickerUserId)

  return (
    <section className="rounded-2xl bg-surface-elevated p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('members.title')}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t('members.desc')}</p>
        </div>
        <Button variant="secondary" className="shrink-0 text-sm" disabled={loading} onClick={() => void refresh()}>
          {loading ? '…' : t('members.refresh')}
        </Button>
      </div>

      {!canManage ? (
        <p className="mt-3 rounded-xl bg-surface-muted px-3 py-2 text-xs text-text-secondary">
          {t('members.viewOnly')}
        </p>
      ) : null}

      <ul className="mt-4 space-y-2">
        {members.length ? (
          members.map((member) => {
            const isSelf = member.userId === cloudUserId
            const linkedPlayer = linkedPlayerByUserId.get(member.userId)
            const banned = isBannedFromGroup(member.bannedAt)
            const busy = busyUserId === member.userId

            return (
              <li
                key={member.userId}
                className={[
                  'rounded-xl bg-surface p-3 ring-1',
                  banned ? 'ring-danger/40 opacity-80' : 'ring-surface-muted',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {memberLabel(member)}
                      {isSelf ? (
                        <span className="ml-1.5 text-xs font-normal text-brand-400">{t('members.you')}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {groupRoleLabel(member.role)}
                      {banned ? ` · ${t('members.bannedBadge')}` : ''}
                    </p>
                    {linkedPlayer ? (
                      <p className="mt-1 text-xs text-brand-200/90">
                        {t('members.linkedPlayer').replace('{name}', linkedPlayer)}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-text-secondary">{t('members.noLinkedPlayer')}</p>
                    )}
                  </div>
                </div>

                {canManage && !isSelf && member.role !== 'owner' ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button
                      variant="secondary"
                      className="min-h-9 py-1.5 text-xs"
                      disabled={busy}
                      onClick={() => setRolePickerUserId(member.userId)}
                    >
                      {t('members.changeRole')}
                    </Button>
                    <Button
                      variant={banned ? 'secondary' : 'danger'}
                      className="min-h-9 py-1.5 text-xs"
                      disabled={busy}
                      onClick={() => void handleBanToggle(member)}
                    >
                      {banned ? t('members.unban') : t('members.ban')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="min-h-9 py-1.5 text-xs text-danger"
                      disabled={busy}
                      onClick={() => void handleRemove(member)}
                    >
                      {t('members.kick')}
                    </Button>
                  </div>
                ) : null}
              </li>
            )
          })
        ) : (
          <li className="rounded-xl border border-dashed border-surface-muted p-4 text-center text-sm text-text-secondary">
            {loading ? t('members.loading') : t('members.empty')}
          </li>
        )}
      </ul>

      <OptionPickerSheet
        open={rolePickerUserId !== null}
        title={t('members.changeRole')}
        options={[
          { value: 'member', label: groupRoleLabel('member') },
          { value: 'reader', label: groupRoleLabel('reader') },
        ]}
        value={rolePickerMember?.role === 'reader' ? 'reader' : 'member'}
        onChange={(value) => {
          if (rolePickerUserId && (value === 'member' || value === 'reader')) {
            void handleRoleChange(rolePickerUserId, value)
          }
        }}
        allLabel={groupRoleLabel('member')}
        onClose={() => setRolePickerUserId(null)}
      />
    </section>
  )
}
