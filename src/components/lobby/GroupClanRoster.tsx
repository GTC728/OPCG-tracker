import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { MemberActionBar } from '@/components/settings/GroupMemberRow'
import { useToast } from '@/components/ui/Toast'
import { useGroupMemberAdmin } from '@/hooks/useGroupMemberAdmin'
import { isCloudConfigured, getCloudSession } from '@/lib/cloudSync'
import { groupRoleLabel } from '@/lib/groupPermissions'
import { resolveMemberDisplayName } from '@/lib/memberDisplay'
import { isDeletedPlayer } from '@/lib/entityVisibility'
import { useI18n } from '@/lib/i18n'
import type { GroupMemberRecord, Player, PlayerInput } from '@/types'
import { useAppStore } from '@/stores/appStore'

type RosterTab = 'roster' | 'accounts'

function parseList(value: string): string[] {
  return value
    .split(/[\n,，、;；/]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function CompactPlayerRow({
  player,
  member,
  canManageMember,
  canTransfer,
  memberBusy,
  onEdit,
  onDelete,
  onMemberRoleChange,
  onMemberBanToggle,
  onMemberRemove,
  onTransferOwnership,
}: {
  player: Player
  member?: GroupMemberRecord | null
  canManageMember?: boolean
  canTransfer?: boolean
  memberBusy?: boolean
  onEdit: () => void
  onDelete: () => void
  onMemberRoleChange?: (userId: string, role: import('@/lib/groupPermissions').GroupMemberRole) => Promise<void>
  onMemberBanToggle?: (member: GroupMemberRecord) => Promise<void>
  onMemberRemove?: (member: GroupMemberRecord) => Promise<void>
  onTransferOwnership?: (member: GroupMemberRecord) => Promise<void>
}) {
  const { t } = useI18n()
  const [manageOpen, setManageOpen] = useState(false)
  const linked = Boolean(player.linkedUserId)
  const showMemberManage =
    Boolean(member) &&
    canManageMember &&
    member?.role !== 'owner' &&
    Boolean(onMemberRoleChange && onMemberBanToggle && onMemberRemove)

  return (
    <>
      <article className="flex items-center gap-2 rounded-xl bg-surface px-2.5 py-2 ring-1 ring-surface-muted">
        <span
          className={[
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            linked ? 'bg-brand-500/20 text-brand-200' : 'bg-surface-muted text-text-secondary',
          ].join(' ')}
        >
          {player.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold">{player.name}</p>
            {member ? (
              <span className="shrink-0 rounded px-1 py-0.5 text-[10px] font-medium text-text-secondary ring-1 ring-surface-muted">
                {groupRoleLabel(member.role)}
              </span>
            ) : null}
            {linked ? (
              <span className="shrink-0 text-[10px] text-brand-300">{t('lobby.linkedBadge')}</span>
            ) : null}
          </div>
          {player.aliases.length ? (
            <p className="truncate text-[11px] text-text-secondary">{player.aliases.join(' · ')}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          {showMemberManage ? (
            <Button
              variant="ghost"
              className="min-h-8 min-w-8 px-2 text-[11px]"
              disabled={memberBusy}
              onClick={() => setManageOpen(true)}
            >
              {t('lobby.manage')}
            </Button>
          ) : null}
          <Button variant="ghost" className="min-h-8 min-w-8 px-2 text-[11px]" onClick={onEdit}>
            {t('lobby.edit')}
          </Button>
          <Button variant="ghost" className="min-h-8 min-w-8 px-2 text-[11px] text-danger" onClick={onDelete}>
            {t('lobby.delete')}
          </Button>
        </div>
      </article>

      {showMemberManage && member ? (
        <BottomSheet open={manageOpen} title={player.name} onClose={() => setManageOpen(false)}>
          <MemberActionBar
            member={member}
            busy={Boolean(memberBusy)}
            canTransfer={canTransfer}
            onRoleChange={onMemberRoleChange!}
            onBanToggle={onMemberBanToggle!}
            onRemove={onMemberRemove!}
            onTransferOwnership={onTransferOwnership}
          />
        </BottomSheet>
      ) : null}
    </>
  )
}

function CompactMemberRow({
  member,
  linkedPlayerName,
  isSelf,
  canManage,
  canTransfer,
  busy,
  onRoleChange,
  onBanToggle,
  onRemove,
  onTransferOwnership,
}: {
  member: GroupMemberRecord
  linkedPlayerName?: string | null
  isSelf: boolean
  canManage: boolean
  canTransfer?: boolean
  busy: boolean
  onRoleChange: (userId: string, role: import('@/lib/groupPermissions').GroupMemberRole) => Promise<void>
  onBanToggle: (member: GroupMemberRecord) => Promise<void>
  onRemove: (member: GroupMemberRecord) => Promise<void>
  onTransferOwnership?: (member: GroupMemberRecord) => Promise<void>
}) {
  const { t } = useI18n()
  const [manageOpen, setManageOpen] = useState(false)
  const displayName = resolveMemberDisplayName(member, linkedPlayerName)
  const banned = Boolean(member.bannedAt)
  const showActions = canManage && !isSelf && member.role !== 'owner'

  return (
    <>
      <article
        className={[
          'flex items-center gap-2 rounded-xl px-2.5 py-2 ring-1',
          banned ? 'bg-surface ring-danger/30 opacity-80' : 'bg-surface ring-surface-muted',
          busy ? 'opacity-60' : '',
        ].join(' ')}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-bold text-text-secondary">
          {displayName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold">
              {displayName}
              {isSelf ? <span className="ml-1 text-[10px] font-normal text-brand-400">{t('members.you')}</span> : null}
            </p>
            <span className="shrink-0 rounded px-1 py-0.5 text-[10px] font-medium text-text-secondary ring-1 ring-surface-muted">
              {groupRoleLabel(member.role)}
            </span>
            {banned ? <span className="text-[10px] text-danger">{t('members.bannedBadge')}</span> : null}
          </div>
          <p className="truncate text-[11px] text-text-secondary">
            {linkedPlayerName ? t('members.linkedPlayer').replace('{name}', linkedPlayerName) : t('members.noLinkedPlayer')}
          </p>
        </div>
        {showActions ? (
          <Button
            variant="ghost"
            className="min-h-8 shrink-0 px-2 text-[11px]"
            disabled={busy}
            onClick={() => setManageOpen(true)}
          >
            {t('lobby.manage')}
          </Button>
        ) : null}
      </article>

      {showActions ? (
        <BottomSheet open={manageOpen} title={displayName} onClose={() => setManageOpen(false)}>
          <MemberActionBar
            member={member}
            busy={busy}
            canTransfer={canTransfer}
            onRoleChange={onRoleChange}
            onBanToggle={onBanToggle}
            onRemove={onRemove}
            onTransferOwnership={onTransferOwnership}
          />
        </BottomSheet>
      ) : null}
    </>
  )
}

function PlayerQuickForm({
  initial,
  onCancel,
  onSave,
}: {
  initial?: Player
  onCancel: () => void
  onSave: (input: PlayerInput) => void
}) {
  const { t } = useI18n()
  const [name, setName] = useState(initial?.name ?? '')
  const [aliasesText, setAliasesText] = useState(initial?.aliases.join(', ') ?? '')

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        onSave({ name: name.trim(), aliases: parseList(aliasesText) })
      }}
    >
      <label className="block text-xs text-text-secondary">
        {t('members.playerName')}
        <input
          className="mt-1 min-h-10 w-full rounded-xl border border-surface-muted bg-surface px-3 text-sm"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </label>
      <label className="block text-xs text-text-secondary">
        {t('members.aliases')}
        <input
          className="mt-1 min-h-10 w-full rounded-xl border border-surface-muted bg-surface px-3 text-sm"
          value={aliasesText}
          onChange={(event) => setAliasesText(event.target.value)}
          placeholder={t('members.aliasesPlaceholder')}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('lobby.cancel')}
        </Button>
        <Button type="submit">{initial ? t('lobby.save') : t('lobby.add')}</Button>
      </div>
    </form>
  )
}

export function GroupClanRoster({ onSession }: { onSession?: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const players = useAppStore((state) => state.players)
  const groupCode = useAppStore((state) => state.settings.lastGroupCode)
  const cloudUserId = useAppStore((state) => state.settings.cloudUserId)
  const addPlayer = useAppStore((state) => state.addPlayer)
  const updatePlayer = useAppStore((state) => state.updatePlayer)
  const deletePlayer = useAppStore((state) => state.deletePlayer)

  const [tab, setTab] = useState<RosterTab>('roster')
  const [members, setMembers] = useState<GroupMemberRecord[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [editor, setEditor] = useState<Player | 'new' | null>(null)

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

  const memberByUserId = useMemo(() => {
    const map = new Map<string, GroupMemberRecord>()
    for (const member of members) {
      map.set(member.userId, member)
    }
    return map
  }, [members])

  const refreshMembers = useCallback(async () => {
    if (!groupCode || !configured) return
    setLoadingMembers(true)
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
      setLoadingMembers(false)
    }
  }, [configured, groupCode, reloadMembers, t, toast])

  useEffect(() => {
    if (tab === 'accounts') void refreshMembers()
  }, [tab, refreshMembers])

  const sortedPlayers = useMemo(() => {
    const list = players.filter((player) => !isDeletedPlayer(player))
    return list.sort((left, right) => {
      const leftLinked = Boolean(left.linkedUserId)
      const rightLinked = Boolean(right.linkedUserId)
      if (leftLinked !== rightLinked) return leftLinked ? -1 : 1
      return left.name.localeCompare(right.name, 'zh-Hant')
    })
  }, [players])

  const tabClass = (value: RosterTab) =>
    [
      'flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition',
      tab === value ? 'bg-brand-500 text-white' : 'bg-surface text-text-secondary ring-1 ring-surface-muted',
    ].join(' ')

  if (!groupCode) return null

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 gap-1.5">
          <button type="button" className={tabClass('roster')} onClick={() => setTab('roster')}>
            {t('members.tabRoster')}
          </button>
          <button type="button" className={tabClass('accounts')} onClick={() => setTab('accounts')}>
            {t('members.tabAuth')}
          </button>
        </div>
        {tab === 'roster' ? (
          <Button className="min-h-8 shrink-0 px-2.5 text-xs" onClick={() => setEditor('new')}>
            +
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="min-h-8 shrink-0 px-2 text-xs"
            disabled={loadingMembers}
            onClick={() => void refreshMembers()}
          >
            ↻
          </Button>
        )}
      </div>

      {onSession ? (
        <button
          type="button"
          className="w-full rounded-lg bg-surface-elevated px-3 py-2 text-left text-xs ring-1 ring-surface-muted"
          onClick={onSession}
        >
          <span className="font-semibold">{t('settings.session')}</span>
          <span className="mt-0.5 block text-[10px] text-text-secondary">{t('lobby.sessionHint')}</span>
        </button>
      ) : null}

      {tab === 'roster' ? (
        <ul className="space-y-1.5">
          {sortedPlayers.length ? (
            sortedPlayers.map((player) => {
              const member = player.linkedUserId ? memberByUserId.get(player.linkedUserId) : null
              const isSelf = member?.userId === cloudUserId
              return (
                <li key={player.id}>
                  <CompactPlayerRow
                    player={player}
                    member={member}
                    canManageMember={canManage && !isSelf}
                    canTransfer={canTransfer && !isSelf}
                    memberBusy={member ? busyUserId === member.userId : false}
                    onEdit={() => setEditor(player)}
                    onDelete={() => {
                      try {
                        deletePlayer(player.id)
                        toast.success(t('delete.playerDone'))
                      } catch (caught) {
                        toast.error(caught instanceof Error ? caught.message : t('delete.failed'))
                      }
                    }}
                    onMemberRoleChange={handleRoleChange}
                    onMemberBanToggle={handleBanToggle}
                    onMemberRemove={(target) => handleRemove(target, player.name)}
                    onTransferOwnership={async (target) => {
                      await handleTransferOwnership(
                        target.userId,
                        resolveMemberDisplayName(target, player.name),
                      )
                    }}
                  />
                </li>
              )
            })
          ) : (
            <li className="rounded-xl border border-dashed border-surface-muted p-4 text-center text-sm text-text-secondary">
              {t('lobby.rosterEmpty')}
            </li>
          )}
        </ul>
      ) : (
        <ul className="space-y-1.5">
          {members.length ? (
            members.map((member) => (
              <li key={member.userId}>
                <CompactMemberRow
                  member={member}
                  linkedPlayerName={linkedPlayerByUserId.get(member.userId)}
                  isSelf={member.userId === cloudUserId}
                  canManage={canManage}
                  canTransfer={canTransfer && member.userId !== cloudUserId}
                  busy={busyUserId === member.userId}
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
              {loadingMembers ? t('members.loading') : t('members.empty')}
            </li>
          )}
        </ul>
      )}

      <BottomSheet
        open={editor !== null}
        title={editor === 'new' ? t('lobby.addPlayer') : t('lobby.editPlayer')}
        onClose={() => setEditor(null)}
      >
        <PlayerQuickForm
          initial={editor && editor !== 'new' ? editor : undefined}
          onCancel={() => setEditor(null)}
          onSave={(input) => {
            if (editor && editor !== 'new') {
              updatePlayer(editor.id, input)
              toast.success(t('lobby.playerUpdated'))
            } else {
              addPlayer(input)
              toast.success(t('lobby.playerAdded'))
            }
            setEditor(null)
          }}
        />
      </BottomSheet>
    </section>
  )
}
