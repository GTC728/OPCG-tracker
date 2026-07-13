import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { IconButton, TabIconButton } from '@/components/ui/IconButton'
import { PermanentDeletePrompt } from '@/components/ui/PermanentDeletePrompt'
import {
  IconAdd,
  IconDelete,
  IconEdit,
  IconLinked,
  IconManage,
  IconMerge,
  IconRefresh,
  IconSessions,
  IconUsers,
} from '@/components/ui/LobbyIcons'
import { GroupClanSessions } from '@/components/lobby/GroupClanSessions'
import { SessionMergeTool } from '@/components/session/SessionMergeTool'
import { PlayerMergeTool } from '@/components/settings/PlayerMergeTool'
import { MemberActionBar } from '@/components/settings/GroupMemberRow'
import { useToast } from '@/components/ui/Toast'
import { useGroupMemberAdmin } from '@/hooks/useGroupMemberAdmin'
import { isCloudConfigured, getCloudSession } from '@/lib/cloudSync'
import { groupRoleLabel } from '@/lib/groupPermissions'
import { resolveMemberDisplayName } from '@/lib/memberDisplay'
import { isDeletedPlayer, countVisibleMatchesForPlayer } from '@/lib/entityVisibility'
import { useI18n } from '@/lib/i18n'
import type { GroupMemberRecord, Player, PlayerInput } from '@/types'
import { useAppStore } from '@/stores/appStore'

type RosterTab = 'roster' | 'accounts' | 'sessions'

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
  canManageRoster,
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
  canManageRoster?: boolean
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
              <span className="inline-flex shrink-0 items-center gap-0.5 text-brand-300" title={t('lobby.linkedBadge')}>
                <IconLinked />
              </span>
            ) : null}
          </div>
          {player.aliases.length ? (
            <p className="truncate text-[11px] text-text-secondary">{player.aliases.join(' · ')}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-0.5">
          {showMemberManage ? (
            <IconButton
              label={t('lobby.manage')}
              disabled={memberBusy}
              onClick={() => setManageOpen(true)}
            >
              <IconManage />
            </IconButton>
          ) : null}
          {canManageRoster ? (
            <>
              <IconButton label={t('lobby.edit')} onClick={onEdit}>
                <IconEdit />
              </IconButton>
              <IconButton label={t('lobby.delete')} variant="danger" onClick={onDelete}>
                <IconDelete />
              </IconButton>
            </>
          ) : null}
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
          <IconButton label={t('lobby.manage')} disabled={busy} onClick={() => setManageOpen(true)}>
            <IconManage />
          </IconButton>
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

export function GroupClanRoster() {
  const { t } = useI18n()
  const toast = useToast()
  const players = useAppStore((state) => state.players)
  const matches = useAppStore((state) => state.matches)
  const activeMatches = useAppStore((state) => state.activeMatches)
  const sessions = useAppStore((state) => state.sessions)
  const mergeSessions = useAppStore((state) => state.mergeSessions)
  const groupCode = useAppStore((state) => state.settings.lastGroupCode)
  const cloudUserId = useAppStore((state) => state.settings.cloudUserId)
  const addPlayer = useAppStore((state) => state.addPlayer)
  const updatePlayer = useAppStore((state) => state.updatePlayer)
  const deletePlayer = useAppStore((state) => state.deletePlayer)

  const [tab, setTab] = useState<RosterTab>('roster')
  const [members, setMembers] = useState<GroupMemberRecord[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [editor, setEditor] = useState<Player | 'new' | null>(null)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [playerMergeOpen, setPlayerMergeOpen] = useState(false)
  const [sessionMergeOpen, setSessionMergeOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Player | null>(null)

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
    if (!groupCode || !configured || tab !== 'accounts') return
    setLoadingMembers(true)
    setMembersError(null)
    try {
      const { user } = await getCloudSession()
      if (!user) {
        setMembers([])
        setMembersError(t('cloud.loginRequired'))
        return
      }
      await reloadMembers()
    } catch (caught) {
      setMembers([])
      setMembersError(caught instanceof Error ? caught.message : t('members.loadFailed'))
    } finally {
      setLoadingMembers(false)
    }
  }, [configured, groupCode, reloadMembers, tab, t])

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

  if (!groupCode) return null

  const matchState = { matches, activeMatches }
  const deleteMatchCount = deleteTarget
    ? countVisibleMatchesForPlayer(matchState, deleteTarget.id)
    : 0

  return (
    <section className="space-y-2">
      {!canManage && tab === 'roster' ? (
        <p className="rounded-xl bg-surface-muted px-3 py-2 text-xs text-text-secondary">
          {t('members.rosterViewOnly')}
        </p>
      ) : null}
      <div className="flex items-center gap-1.5">
        <TabIconButton label={t('members.tabRoster')} active={tab === 'roster'} onClick={() => setTab('roster')}>
          <IconUsers />
        </TabIconButton>
        <TabIconButton label={t('members.tabAuth')} active={tab === 'accounts'} onClick={() => setTab('accounts')}>
          <IconLinked />
        </TabIconButton>
        <TabIconButton label={t('settings.session')} active={tab === 'sessions'} onClick={() => setTab('sessions')}>
          <IconSessions />
        </TabIconButton>
        {tab === 'roster' && canManage ? (
          <>
            <IconButton label={t('data.mergePlayers')} onClick={() => setPlayerMergeOpen(true)}>
              <IconMerge />
            </IconButton>
            <IconButton label={t('lobby.addPlayer')} variant="brand" onClick={() => setEditor('new')}>
              <IconAdd />
            </IconButton>
          </>
        ) : tab === 'accounts' ? (
          <IconButton label={t('members.refresh')} disabled={loadingMembers} onClick={() => void refreshMembers()}>
            <IconRefresh />
          </IconButton>
        ) : tab === 'sessions' && canManage ? (
          <IconButton label={t('session.mergeTitle')} onClick={() => setSessionMergeOpen(true)}>
            <IconMerge />
          </IconButton>
        ) : null}
      </div>

      {tab === 'roster' ? (
        <>
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
                      canManageRoster={canManage}
                      canTransfer={canTransfer && !isSelf}
                      memberBusy={member ? busyUserId === member.userId : false}
                      onEdit={() => setEditor(player)}
                      onDelete={() => setDeleteTarget(player)}
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
        </>
      ) : tab === 'accounts' ? (
        <>
          {membersError ? (
            <div className="flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2">
              <p className="min-w-0 flex-1 text-sm text-red-200">{membersError}</p>
              <Button
                variant="ghost"
                className="min-h-8 shrink-0 px-2 text-xs"
                disabled={loadingMembers}
                onClick={() => void refreshMembers()}
              >
                {t('members.refresh')}
              </Button>
            </div>
          ) : null}
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
        </>
      ) : (
        <GroupClanSessions canManage={canManage} />
      )}

      <PermanentDeletePrompt
        open={deleteTarget !== null}
        title={t('delete.playerTitle')}
        description={
          deleteMatchCount > 0
            ? t('delete.playerDescWithMatches').replace('{n}', String(deleteMatchCount))
            : t('delete.playerDesc')
        }
        detail={deleteTarget?.name}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return
          try {
            deletePlayer(deleteTarget.id)
            toast.success(t('delete.playerDone'))
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : t('delete.failed'))
          }
        }}
      />

      <BottomSheet
        open={playerMergeOpen}
        title={t('data.mergePlayers')}
        onClose={() => setPlayerMergeOpen(false)}
      >
        <PlayerMergeTool compact />
      </BottomSheet>

      <BottomSheet
        open={sessionMergeOpen}
        title={t('session.mergeTitle')}
        onClose={() => setSessionMergeOpen(false)}
      >
        <SessionMergeTool
          compact
          sessions={sessions}
          onMerge={(sourceId, targetId) => {
            mergeSessions(sourceId, targetId)
          }}
        />
      </BottomSheet>

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
