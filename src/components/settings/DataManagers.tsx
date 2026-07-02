import { useState } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
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

function ListField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-text-secondary">{label}</span>
      <textarea
        className="mt-2 min-h-24 w-full rounded-xl border border-surface-muted bg-surface px-4 py-3 text-base text-text-primary outline-none transition focus:border-brand-500"
        placeholder={placeholder}
        value={formatList(value)}
        onChange={(event) => onChange(parseList(event.target.value))}
      />
      <span className="mt-1 block text-xs text-text-secondary">
        可用逗號、頓號、分號、斜線或換行分隔；一般空格會保留在名稱中。
      </span>
    </label>
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
      <ListField
        label="別名"
        placeholder="例如 Bob, B"
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
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
          {deck.leaderCode}
        </p>
        <h3 className="mt-1 text-lg font-semibold">{deck.leaderName}</h3>
        <p className="mt-1 text-sm text-text-secondary">
          可以加入本地叫法，例如：黑胡、紅髮、紫路、藍多佛。
        </p>
      </section>
      <ListField
        label="搜尋別名"
        placeholder="黑胡, BB, Blackbeard"
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

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-surface-muted p-4 text-center text-sm text-text-secondary">
      {children}
    </div>
  )
}

function ArchiveBadge({ archived }: { archived: boolean }) {
  if (!archived) return null

  return (
    <span className="rounded-full bg-warning/15 px-2 py-1 text-xs font-medium text-yellow-200">
      已封存
    </span>
  )
}

function PlayerCard({
  player,
  onEdit,
  onArchiveChange,
}: {
  player: Player
  onEdit: () => void
  onArchiveChange: (archived: boolean) => void
}) {
  return (
    <article className="rounded-2xl bg-surface p-4 ring-1 ring-surface-muted">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{player.name}</h3>
            <ArchiveBadge archived={player.archived} />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {player.aliases.length ? `別名：${formatList(player.aliases)}` : '未設定別名'}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" className="min-h-10 py-2 text-sm" onClick={onEdit}>
          編輯
        </Button>
        <Button
          variant={player.archived ? 'ghost' : 'danger'}
          className="min-h-10 py-2 text-sm"
          onClick={() => onArchiveChange(!player.archived)}
        >
          {player.archived ? '還原' : '封存'}
        </Button>
      </div>
    </article>
  )
}

function DeckCard({
  deck,
  onEditAliases,
  onArchiveChange,
}: {
  deck: Deck
  onEditAliases: () => void
  onArchiveChange: (archived: boolean) => void
}) {
  return (
    <article className="rounded-2xl bg-surface p-4 ring-1 ring-surface-muted">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">
              <DeckLabel deck={deck} />
            </h3>
            <ArchiveBadge archived={deck.archived} />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {deck.leaderCode || '未設定詳細資料'}
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            {deck.aliases.length ? `別名：${formatList(deck.aliases)}` : '未設定別名'}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" className="min-h-10 py-2 text-sm" onClick={onEditAliases}>
          編輯別名
        </Button>
        <Button
          variant={deck.archived ? 'ghost' : 'danger'}
          className="min-h-10 py-2 text-sm"
          onClick={() => onArchiveChange(!deck.archived)}
        >
          {deck.archived ? '還原' : '封存'}
        </Button>
      </div>
    </article>
  )
}

export function DataManagers() {
  const toast = useToast()
  const players = useAppStore((state) => state.players)
  const decks = useAppStore((state) => state.decks)
  const addPlayer = useAppStore((state) => state.addPlayer)
  const updatePlayer = useAppStore((state) => state.updatePlayer)
  const setPlayerArchived = useAppStore((state) => state.setPlayerArchived)
  const setDeckArchived = useAppStore((state) => state.setDeckArchived)
  const updateDeckAliases = useAppStore((state) => state.updateDeckAliases)
  const [editor, setEditor] = useState<EditorState>(null)

  const sortedPlayers = [...players].sort((left, right) => {
    if (left.archived !== right.archived) return left.archived ? 1 : -1
    return left.name.localeCompare(right.name, 'zh-Hant')
  })
  const sortedDecks = [...decks].sort((left, right) => {
    if (left.archived !== right.archived) return left.archived ? 1 : -1
    return left.displayName.localeCompare(right.displayName, 'zh-Hant')
  })

  return (
    <>
      <section className="rounded-2xl bg-surface-elevated p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">玩家管理</h2>
            <p className="mt-1 text-sm text-text-secondary">新增、編輯、別名與封存玩家。</p>
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
                onArchiveChange={(archived) => {
                  setPlayerArchived(player.id, archived)
                  toast.success(archived ? '玩家已封存' : '玩家已還原')
                }}
              />
            ))
          ) : (
            <EmptyState>尚未建立玩家。先新增常用玩家，Step 4 新對局會用到。</EmptyState>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-surface-elevated p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Leader 牌組資料庫</h2>
            <p className="mt-1 text-sm text-text-secondary">
              已內建 OPCG Leader。新對局可搜尋 OP / ST / EB / leader 名稱。
            </p>
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
                onArchiveChange={(archived) => {
                  setDeckArchived(deck.id, archived)
                  toast.success(archived ? 'Leader 已封存' : 'Leader 已還原')
                }}
              />
            ))
          ) : (
            <EmptyState>尚未建立牌組。牌組資料會在新對局搜尋與統計分析中使用。</EmptyState>
          )}
        </div>
      </section>

      <BottomSheet
        open={editor !== null}
        title={
          editor?.kind === 'deckAliases'
            ? '編輯 Leader 別名'
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
              toast.success('Leader 別名已更新')
              setEditor(null)
            }}
          />
        ) : null}
      </BottomSheet>
    </>
  )
}
