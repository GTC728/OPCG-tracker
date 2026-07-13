import { useEffect, useMemo, useState } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { MemberActionBar } from '@/components/settings/GroupMemberRow'
import { PermanentDeletePrompt } from '@/components/ui/PermanentDeletePrompt'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { FilterPickerRow, OptionPickerSheet, useFilterSheet } from '@/components/ui/FilterPicker'
import { useToast } from '@/components/ui/Toast'
import { groupRoleLabel } from '@/lib/groupPermissions'
import { resolveMemberDisplayName } from '@/lib/memberDisplay'
import { useI18n } from '@/lib/i18n'
import {
  countVisibleMatchesForPlayer,
  getMergeEligiblePlayers,
  isDeletedPlayer,
} from '@/lib/entityVisibility'
import { useGroupMemberAdmin } from '@/hooks/useGroupMemberAdmin'
import { useAppStore } from '@/stores/appStore'
import type { Deck, GroupMemberRecord, Player, PlayerInput } from '@/types'

type EditorState =
  | { kind: 'player'; item?: Player }
  | { kind: 'deckAliases'; item: Deck }
  | null

const emptyPlayerInput: PlayerInput = {
  name: '',
  aliases: [],
}

function parseList(value: string): string[] {
  return value
    .split(/[\n,，、;；/]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatList(values: string[]): string {
  return values.join(', ')
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-text-secondary">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      <input
        className="mt-2 min-h-12 w-full rounded-xl border border-surface-muted bg-surface px-4 py-3 text-base text-text-primary outline-none transition focus:border-brand-500"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function AliasChipsField({
  label,
  value,
  onChange,
  placeholder = '新增別名',
}: {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')

  const addAlias = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    const next = [...value]
    for (const part of parseList(trimmed)) {
      if (!next.some((item) => item.toLowerCase() === part.toLowerCase())) {
        next.push(part)
      }
    }
    onChange(next)
    setDraft('')
  }

  return (
    <div>
      <span className="text-sm font-medium text-text-secondary">{label}</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {value.map((alias) => (
          <span
            key={alias}
            className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1.5 text-sm"
          >
            {alias}
            <button
              type="button"
              className="text-text-secondary hover:text-danger"
              onClick={() => onChange(value.filter((item) => item !== alias))}
              aria-label={`移除 ${alias}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className="min-h-11 flex-1 rounded-xl border border-surface-muted bg-surface px-4 py-2 text-base text-text-primary outline-none transition focus:border-brand-500"
          placeholder={placeholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addAlias()
            }
          }}
        />
        <Button type="button" variant="secondary" className="min-h-11 shrink-0 px-4" onClick={addAlias}>
          + 新增
        </Button>
      </div>
      <span className="mt-1 block text-xs text-text-secondary">
        按 Enter 或「+ 新增」加入別名；也可一次貼上逗號分隔的多個名稱。
      </span>
    </div>
  )
}

function PlayerForm({
  initial,
  onCancel,
  onSave,
}: {
  initial?: Player
  onCancel: () => void
  onSave: (input: PlayerInput) => void
}) {
  const [input, setInput] = useState<PlayerInput>(
    initial ? { name: initial.name, aliases: initial.aliases } : emptyPlayerInput,
  )
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        try {
          onSave(input)
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : '儲存失敗')
        }
      }}
    >
      <Field
        label="玩家名稱"
        placeholder="例如 Bobby"
        required
        value={input.name}
        onChange={(name) => setInput((current) => ({ ...current, name }))}
      />
      <AliasChipsField
        label="別名"
        placeholder="例如 Bob"
        value={input.aliases}
        onChange={(aliases) => setInput((current) => ({ ...current, aliases }))}
      />
      {error ? <p className="rounded-xl bg-danger/10 p-3 text-sm text-red-200">{error}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">{initial ? '儲存玩家' : '新增玩家'}</Button>
      </div>
    </form>
  )
}

function DeckAliasForm({
  deck,
  onCancel,
  onSave,
}: {
  deck: Deck
  onCancel: () => void
  onSave: (aliases: string[]) => void
}) {
  const [aliases, setAliases] = useState(deck.aliases)

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSave(aliases)
      }}
    >
      <section className="rounded-2xl bg-surface p-4">
        <h3 className="text-lg font-semibold">
          <DeckLabel deck={deck} />
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          可以加入本地叫法，例如：黑胡、紅髮、紫路、藍多佛。
        </p>
      </section>
      <AliasChipsField
        label="自訂別名"
        placeholder="黑胡, 沙佬"
        value={aliases}
        onChange={setAliases}
      />
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">儲存別名</Button>
      </div>
    </form>
  )
}

function PlayerMergeTool() {
  const { t } = useI18n()
  const players = useAppStore((state) => state.players)
  const matches = useAppStore((state) => state.matches)
  const activeMatches = useAppStore((state) => state.activeMatches)
  const mergePlayers = useAppStore((state) => state.mergePlayers)
  const toast = useToast()
  const sheet = useFilterSheet()
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')

  const matchState = useMemo(() => ({ matches, activeMatches }), [activeMatches, matches])
  const eligiblePlayers = useMemo(
    () => getMergeEligiblePlayers({ players, matches, activeMatches }),
    [activeMatches, matches, players],
  )

  const playerOptions = useMemo(
    () =>
      eligiblePlayers.map((player) => {
        const matchCount = countVisibleMatchesForPlayer(matchState, player.id)
        return {
          value: player.id,
          label: `${player.name} · ${matchCount} 場`,
        }
      }),
    [eligiblePlayers, matchState],
  )

  const sourcePlayer = eligiblePlayers.find((player) => player.id === sourceId)
  const targetPlayer = eligiblePlayers.find((player) => player.id === targetId)

  const handleMerge = () => {
    if (!sourceId || !targetId || sourceId === targetId || !sourcePlayer || !targetPlayer) return
    const confirmed = window.confirm(
      `確定將「${sourcePlayer.name}」合併到「${targetPlayer.name}」？\n合併後對局紀錄會指向保留玩家，被合併的玩家會刪除。`,
    )
    if (!confirmed) return

    try {
      mergePlayers(sourceId, targetId)
      toast.success('玩家已合併')
      setSourceId('')
      setTargetId('')
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : '合併失敗')
    }
  }

  return (
    <section className="rounded-2xl bg-surface-elevated p-4 ring-1 ring-surface-muted">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-lg text-brand-400">
          ⇄
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{t('data.mergePlayers')}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t('data.mergePlayersDesc')}</p>
        </div>
      </div>

      {eligiblePlayers.length < 2 ? (
        <p className="mt-4 rounded-xl border border-dashed border-surface-muted px-3 py-4 text-center text-sm text-text-secondary">
          需要至少兩位有對局紀錄的玩家才能合併。
        </p>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            <FilterPickerRow
              label={t('data.mergeSource')}
              value={sourcePlayer ? sourcePlayer.name : ''}
              placeholder={t('data.mergePick')}
              onClick={() => sheet.open('source')}
            />
            <div className="flex justify-center py-0.5 text-xs text-text-secondary" aria-hidden>
              ↓
            </div>
            <FilterPickerRow
              label={t('data.mergeTarget')}
              value={targetPlayer ? targetPlayer.name : ''}
              placeholder={t('data.mergePick')}
              onClick={() => sheet.open('target')}
            />
          </div>

          <Button
            className="mt-4"
            fullWidth
            disabled={!sourceId || !targetId || sourceId === targetId}
            onClick={handleMerge}
          >
            {t('data.mergeAction')}
          </Button>
        </>
      )}

      <OptionPickerSheet
        open={sheet.isOpen('source')}
        title={t('data.mergeSource')}
        options={playerOptions.filter((option) => option.value !== targetId)}
        value={sourceId}
        allLabel={t('data.mergePick')}
        onChange={setSourceId}
        onClose={sheet.close}
      />
      <OptionPickerSheet
        open={sheet.isOpen('target')}
        title={t('data.mergeTarget')}
        options={playerOptions.filter((option) => option.value !== sourceId)}
        value={targetId}
        allLabel={t('data.mergePick')}
        onChange={setTargetId}
        onClose={sheet.close}
      />
    </section>
  )
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-surface-muted p-4 text-center text-sm text-text-secondary">
      {children}
    </div>
  )
}

function PlayerCard({
  player,
  member,
  linkedAccountLabel,
  canManageMember,
  canTransfer,
  memberBusy,
  onMemberRoleChange,
  onMemberBanToggle,
  onMemberRemove,
  onTransferOwnership,
  onEdit,
  onDelete,
}: {
  player: Player
  member?: GroupMemberRecord | null
  linkedAccountLabel?: string | null
  canManageMember?: boolean
  canTransfer?: boolean
  memberBusy?: boolean
  onMemberRoleChange?: (userId: string, role: import('@/lib/groupPermissions').GroupMemberRole) => Promise<void>
  onMemberBanToggle?: (member: GroupMemberRecord) => Promise<void>
  onMemberRemove?: (member: GroupMemberRecord) => Promise<void>
  onTransferOwnership?: (member: GroupMemberRecord) => Promise<void>
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()
  const [manageOpen, setManageOpen] = useState(false)
  const linked = Boolean(player.linkedUserId)
  const showMemberActions =
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
          </div>
          <p className="truncate text-[11px] text-text-secondary">
            {player.aliases.length
              ? player.aliases.join(' · ')
              : linkedAccountLabel
                ? t('members.accountLabel').replace('{name}', linkedAccountLabel)
                : t('members.noAliases')}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {showMemberActions && member ? (
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

      {showMemberActions && member ? (
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

function DeckCard({
  deck,
  onEditAliases,
  onDelete,
}: {
  deck: Deck
  onEditAliases: () => void
  onDelete: () => void
}) {
  return (
    <article className="rounded-2xl bg-surface p-4 ring-1 ring-surface-muted">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            <DeckLabel deck={deck} />
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            {deck.aliases.length ? `別名：${formatList(deck.aliases)}` : '未設定別名'}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" className="min-h-10 py-2 text-sm" onClick={onEditAliases}>
          編輯別名
        </Button>
        <Button variant="danger" className="min-h-10 py-2 text-sm" onClick={onDelete}>
          刪除
        </Button>
      </div>
    </article>
  )
}

export function DataManagers({ mode = 'all' }: { mode?: 'all' | 'players' | 'leaders' }) {
  const { t } = useI18n()
  const toast = useToast()
  const players = useAppStore((state) => state.players)
  const groupCode = useAppStore((state) => state.settings.lastGroupCode)
  const cloudUserId = useAppStore((state) => state.settings.cloudUserId)
  const decks = useAppStore((state) => state.decks)
  const addPlayer = useAppStore((state) => state.addPlayer)
  const updatePlayer = useAppStore((state) => state.updatePlayer)
  const deletePlayer = useAppStore((state) => state.deletePlayer)
  const permanentlyDeleteDeck = useAppStore((state) => state.permanentlyDeleteDeck)
  const updateDeckAliases = useAppStore((state) => state.updateDeckAliases)
  const setActiveTab = useAppStore((state) => state.setActiveTab)
  const [editor, setEditor] = useState<EditorState>(null)
  const [purgePlayer, setPurgePlayer] = useState<Player | null>(null)
  const [purgeDeck, setPurgeDeck] = useState<Deck | null>(null)
  const [members, setMembers] = useState<GroupMemberRecord[]>([])
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

  useEffect(() => {
    if (!groupCode) {
      setMembers([])
      return
    }
    void reloadMembers().catch(() => setMembers([]))
  }, [groupCode, reloadMembers])

  const sortedPlayers = [...players]
    .filter((player) => !isDeletedPlayer(player))
    .sort((left, right) => {
      const leftLinked = Boolean(left.linkedUserId)
      const rightLinked = Boolean(right.linkedUserId)
      if (leftLinked !== rightLinked) return leftLinked ? -1 : 1
      return left.name.localeCompare(right.name, 'zh-Hant')
    })
  const sortedDecks = [...decks].sort((left, right) =>
    left.displayName.localeCompare(right.displayName, 'zh-Hant'),
  )

  const memberByUserId = useMemo(() => {
    const map = new Map<string, GroupMemberRecord>()
    for (const member of members) {
      map.set(member.userId, member)
    }
    return map
  }, [members])

  const linkedAccountByUserId = useMemo(() => {
    const map = new Map<string, string>()
    for (const member of members) {
      const linkedPlayer = players.find(
        (player) => player.linkedUserId === member.userId && !isDeletedPlayer(player),
      )
      map.set(
        member.userId,
        resolveMemberDisplayName(member, linkedPlayer?.name),
      )
    }
    return map
  }, [members, players])

  return (
    <>
      {mode !== 'leaders' ? (
      <section className="rounded-2xl bg-surface-elevated p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{t('members.rosterTitle')}</h2>
            <p className="mt-0.5 text-xs text-text-secondary">{t('members.rosterDesc')}</p>
          </div>
          <Button className="min-h-8 shrink-0 px-2.5 text-xs" onClick={() => setEditor({ kind: 'player' })}>
            +
          </Button>
        </div>

        <div className="mt-3 space-y-1.5">
          {sortedPlayers.length ? (
            sortedPlayers.map((player) => {
              const member = player.linkedUserId ? memberByUserId.get(player.linkedUserId) : null
              const isSelf = member?.userId === cloudUserId
              return (
              <PlayerCard
                key={player.id}
                player={player}
                member={member}
                linkedAccountLabel={
                  player.linkedUserId ? linkedAccountByUserId.get(player.linkedUserId) : null
                }
                canManageMember={canManage && !isSelf}
                canTransfer={canTransfer && !isSelf}
                memberBusy={member ? busyUserId === member.userId : false}
                onMemberRoleChange={handleRoleChange}
                onMemberBanToggle={handleBanToggle}
                onMemberRemove={(target) => handleRemove(target, player.name)}
                onTransferOwnership={async (target) => {
                  await handleTransferOwnership(
                    target.userId,
                    linkedAccountByUserId.get(target.userId) ?? target.userId.slice(0, 8),
                  )
                }}
                onEdit={() => setEditor({ kind: 'player', item: player })}
                onDelete={() => setPurgePlayer(player)}
              />
            )})
          ) : (
            <EmptyState>尚未建立玩家。先新增常用玩家，Step 4 新對局會用到。</EmptyState>
          )}
        </div>

        {groupCode ? (
          <p className="mt-3 text-center text-[11px] text-text-secondary">{t('lobby.rosterInLobbyHint')}</p>
        ) : null}
      </section>
      ) : null}

      {mode !== 'leaders' ? <PlayerMergeTool /> : null}

      {mode !== 'players' ? (
      <section className="rounded-2xl bg-surface-elevated p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('settings.leadersDatabase')}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t('settings.leadersDatabaseDesc')}</p>
          </div>
          <span className="shrink-0 rounded-full bg-surface-muted px-3 py-1 text-xs text-text-secondary">
            {decks.length} 張
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {sortedDecks.length ? (
            sortedDecks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onEditAliases={() => setEditor({ kind: 'deckAliases', item: deck })}
                onDelete={() => setPurgeDeck(deck)}
              />
            ))
          ) : (
            <EmptyState>尚未建立牌組。牌組資料會在新對局搜尋與統計分析中使用。</EmptyState>
          )}
        </div>
      </section>
      ) : null}

      <BottomSheet
        open={editor !== null}
        title={
          editor?.kind === 'deckAliases'
            ? t('settings.editLeaderAliases')
            : editor?.item
              ? '編輯玩家'
              : '新增玩家'
        }
        onClose={() => setEditor(null)}
      >
        {editor?.kind === 'player' ? (
          <PlayerForm
            initial={editor.item}
            onCancel={() => setEditor(null)}
            onSave={(input) => {
              if (editor.item) {
                updatePlayer(editor.item.id, input)
                toast.success('玩家已更新')
              } else {
                addPlayer(input)
                toast.success('玩家已新增')
              }
              setEditor(null)
            }}
          />
        ) : editor?.kind === 'deckAliases' ? (
          <DeckAliasForm
            deck={editor.item}
            onCancel={() => setEditor(null)}
            onSave={(aliases) => {
              updateDeckAliases(editor.item.id, aliases)
              toast.success(t('settings.leaderAliasesUpdated'))
              setEditor(null)
            }}
          />
        ) : null}
      </BottomSheet>

      <PermanentDeletePrompt
        open={purgePlayer !== null}
        title={t('delete.playerTitle')}
        description={t('delete.playerDesc')}
        detail={purgePlayer?.name}
        onClose={() => setPurgePlayer(null)}
        onBackup={() => {
          setPurgePlayer(null)
          setActiveTab('settings')
        }}
        onConfirm={() => {
          if (!purgePlayer) return
          try {
            deletePlayer(purgePlayer.id)
            toast.success(t('delete.playerDone'))
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : t('delete.failed'))
          }
        }}
      />

      <PermanentDeletePrompt
        open={purgeDeck !== null}
        title={t('delete.deckTitle')}
        description={t('delete.deckDesc')}
        detail={purgeDeck?.displayName}
        onClose={() => setPurgeDeck(null)}
        onBackup={() => {
          setPurgeDeck(null)
          setActiveTab('settings')
        }}
        onConfirm={() => {
          if (!purgeDeck) return
          try {
            permanentlyDeleteDeck(purgeDeck.id)
            toast.success(t('delete.deckDone'))
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : t('delete.failed'))
          }
        }}
      />
    </>
  )
}
