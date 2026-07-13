import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { GroupMemberRow } from '@/components/settings/GroupMemberRow'
import { useToast } from '@/components/ui/Toast'
import { useGroupMemberAdmin } from '@/hooks/useGroupMemberAdmin'
import { isCloudConfigured, getCloudSession } from '@/lib/cloudSync'
import { resolveMemberDisplayName } from '@/lib/memberDisplay'
import { useI18n } from '@/lib/i18n'
import type { GroupMemberRecord } from '@/types'
import { useAppStore } from '@/stores/appStore'

interface GroupMembersPanelProps {
  /** When true, only show members not linked to a roster player. */
  unlinkedOnly?: boolean
  embedded?: boolean
}

export function GroupMembersPanel({ unlinkedOnly = false, embedded = false }: GroupMembersPanelProps) {
  const { t } = useI18n()
  const toast = useToast()
  const groupCode = useAppStore((state) => state.settings.lastGroupCode)
  const cloudUserId = useAppStore((state) => state.settings.cloudUserId)
  const players = useAppStore((state) => state.players)
  const [members, setMembers] = useState<GroupMemberRecord[]>([])
  const [loading, setLoading] = useState(false)

  const {
    canManage,
    canTransfer,
    busyUserId,
    handleRoleChange,
    handleBanToggle,
    handleRemove,
    handleTransferOwnership,
    reloadMembers,
  } = useGroupMemberAdmin(setMembers)

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

  const linkedUserIds = useMemo(() => new Set(linkedPlayerByUserId.keys()), [linkedPlayerByUserId])

  const refresh = useCallback(async () => {
    if (!groupCode || !configured) return
    setLoading(true)
    try {
      const { user } = await getCloudSession()
      if (!user) {
        setMembers([])
        return
      }
      await reloadMembers()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('members.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [configured, groupCode, reloadMembers, t, toast])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const visibleMembers = useMemo(() => {
    if (!unlinkedOnly) return members
    return members.filter((member) => !linkedUserIds.has(member.userId))
  }, [linkedUserIds, members, unlinkedOnly])

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

  return (
    <section className={embedded ? '' : 'rounded-2xl bg-surface-elevated p-4'}>
      {!embedded ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('members.title')}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t('members.desc')}</p>
          </div>
          <Button variant="secondary" className="shrink-0 text-xs" disabled={loading} onClick={() => void refresh()}>
            {loading ? '…' : t('members.refresh')}
          </Button>
        </div>
      ) : null}

      {unlinkedOnly ? (
        <p className={embedded ? 'text-xs text-text-secondary' : 'mt-3 text-xs text-text-secondary'}>
          {t('members.unlinkedDesc')}
        </p>
      ) : null}

      {!canManage ? (
        <p className={embedded ? 'mt-2 rounded-xl bg-surface-muted px-3 py-2 text-xs text-text-secondary' : 'mt-3 rounded-xl bg-surface-muted px-3 py-2 text-xs text-text-secondary'}>
          {t('members.viewOnly')}
        </p>
      ) : null}

      <ul className={embedded ? 'mt-2 space-y-2' : 'mt-4 space-y-2'}>
        {visibleMembers.length ? (
          visibleMembers.map((member) => (
            <li key={member.userId}>
              <GroupMemberRow
                member={member}
                linkedPlayerName={linkedPlayerByUserId.get(member.userId)}
                isSelf={member.userId === cloudUserId}
                canManage={canManage}
                canTransfer={canTransfer && member.userId !== cloudUserId}
                busy={busyUserId === member.userId}
                compact={embedded}
                onRoleChange={handleRoleChange}
                onBanToggle={handleBanToggle}
                onRemove={(target) => handleRemove(target, linkedPlayerByUserId.get(target.userId))}
                onTransferOwnership={async (target) => {
                  await handleTransferOwnership(
                    target.userId,
                    resolveMemberDisplayName(target, linkedPlayerByUserId.get(target.userId)),
                  )
                }}
              />
            </li>
          ))
        ) : (
          <li className="rounded-xl border border-dashed border-surface-muted p-4 text-center text-sm text-text-secondary">
            {loading
              ? t('members.loading')
              : unlinkedOnly
                ? t('members.allLinked')
                : t('members.empty')}
          </li>
        )}
      </ul>
    </section>
  )
}
