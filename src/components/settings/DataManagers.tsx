import { useState } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { PermanentDeletePrompt } from '@/components/ui/PermanentDeletePrompt'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/lib/i18n'
import { isDeletedPlayer } from '@/lib/entityVisibility'
import { useAppStore } from '@/stores/appStore'
import type { Deck, Player, PlayerInput } from '@/types'

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
  const players = useAppStore((state) => state.players)
  const mergePlayers = useAppStore((state) => state.mergePlayers)
  const toast = useToast()
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  return (
    <section className="rounded-2xl bg-surface-elevated p-4">
      <h2 className="text-lg font-semibold">玩家合併</h2>
      <p className="mt-1 text-sm text-text-secondary">
        修正重複玩家。合併後歷史對局會指向保留玩家。
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label>
          <span className="text-sm text-text-secondary">要合併走</span>
          <select
            className="mt-2 min-h-11 w-full rounded-xl border border-surface-muted bg-surface px-3 text-text-primary"
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
          >
            <option value="">選玩家</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm text-text-secondary">保留為</span>
          <select
            className="mt-2 min-h-11 w-full rounded-xl border border-surface-muted bg-surface px-3 text-text-primary"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
          >
            <option value="">選玩家</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Button
        className="mt-3"
        fullWidth
        disabled={!sourceId || !targetId || sourceId === targetId}
        onClick={() => {
          try {
            mergePlayers(sourceId, targetId)
            setMessage('玩家已合併')
            toast.success('玩家已合併')
            setSourceId('')
            setTargetId('')
          } catch (caught) {
            const nextMessage = caught instanceof Error ? caught.message : '合併失敗'
            setMessage(nextMessage)
            toast.error(nextMessage)
          }
        }}
      >
        合併玩家
      </Button>
      {message ? <p className="mt-3 text-sm text-text-secondary">{message}</p> : null}
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
  onEdit,
  onDelete,
}: {
  player: Player
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <article className="rounded-2xl bg-surface p-4 ring-1 ring-surface-muted">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{player.name}</h3>
          <p className="mt-1 text-sm text-text-secondary">
            {player.aliases.length ? `別名：${formatList(player.aliases)}` : '未設定別名'}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" className="min-h-10 py-2 text-sm" onClick={onEdit}>
          編輯
        </Button>
        <Button variant="danger" className="min-h-10 py-2 text-sm" onClick={onDelete}>
          刪除
        </Button>
      </div>
    </article>
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

  const sortedPlayers = [...players]
    .filter((player) => !isDeletedPlayer(player))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hant'))
  const sortedDecks = [...decks].sort((left, right) =>
    left.displayName.localeCompare(right.displayName, 'zh-Hant'),
  )

  return (
    <>
      {mode !== 'leaders' ? (
      <section className="rounded-2xl bg-surface-elevated p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">玩家管理</h2>
            <p className="mt-1 text-sm text-text-secondary">新增、編輯、別名與刪除玩家。</p>
          </div>
          <Button className="shrink-0 text-sm" onClick={() => setEditor({ kind: 'player' })}>
            新增
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {sortedPlayers.length ? (
            sortedPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onEdit={() => setEditor({ kind: 'player', item: player })}
                onDelete={() => setPurgePlayer(player)}
              />
            ))
          ) : (
            <EmptyState>尚未建立玩家。先新增常用玩家，Step 4 新對局會用到。</EmptyState>
          )}
        </div>
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
