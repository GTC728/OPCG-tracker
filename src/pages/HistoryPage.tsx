import { useMemo, useState } from 'react'
import { DeckSearchField } from '@/components/deck/DeckSearchField'
import { MatchResultRow } from '@/components/match/MatchResultRow'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { getPlayerName } from '@/lib/entities'
import { useI18n } from '@/lib/i18n'
import { formatDateTime } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'
import type { Deck, Match, MatchEditInput, Player } from '@/types'

type DateFilter = 'all' | 'today' | 'week'

function isToday(iso: string): boolean {
  const date = new Date(iso)
  const today = new Date()

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

function isThisWeek(iso: string): boolean {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  return diffMs >= 0 && diffMs <= 7 * 24 * 60 * 60 * 1000
}

function matchIncludesPlayer(match: Match, playerId: string): boolean {
  return match.player1Id === playerId || match.player2Id === playerId
}

function matchIncludesDeck(match: Match, deckId: string): boolean {
  return match.deck1Id === deckId || match.deck2Id === deckId
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-sm text-text-secondary">{label}</span>
      <select
        className="mt-2 min-h-12 w-full rounded-xl border border-surface-muted bg-surface px-3 text-text-primary"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  )
}

function EditMatchForm({
  match,
  players,
  decks,
  onCancel,
  onSave,
}: {
  match: Match
  players: Player[]
  decks: Deck[]
  onCancel: () => void
  onSave: (input: MatchEditInput) => void
}) {
  const [input, setInput] = useState<MatchEditInput>({
    player1Id: match.player1Id,
    deck1Id: match.deck1Id,
    player2Id: match.player2Id,
    deck2Id: match.deck2Id,
    winnerPlayerId: match.winnerPlayerId,
    firstPlayerId: match.firstPlayerId,
    notes: match.notes,
  })
  const [error, setError] = useState<string | null>(null)

  const patchInput = (patch: Partial<MatchEditInput>) => {
    setInput((current) => {
      const next = { ...current, ...patch }
      if (next.winnerPlayerId !== next.player1Id && next.winnerPlayerId !== next.player2Id) {
        next.winnerPlayerId = ''
      }
      if (
        next.firstPlayerId !== null &&
        next.firstPlayerId !== next.player1Id &&
        next.firstPlayerId !== next.player2Id
      ) {
        next.firstPlayerId = null
      }
      return next
    })
  }

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
      <SelectField label="玩家 A" value={input.player1Id} onChange={(player1Id) => patchInput({ player1Id })}>
        <option value="">選擇玩家 A</option>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name}
          </option>
        ))}
      </SelectField>
      <DeckSearchField
        label="牌組 A"
        value={input.deck1Id}
        decks={decks}
        onChange={(deck1Id) => patchInput({ deck1Id })}
        showResultsWhenEmpty={false}
      />
      <SelectField label="玩家 B" value={input.player2Id} onChange={(player2Id) => patchInput({ player2Id })}>
        <option value="">選擇玩家 B</option>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name}
          </option>
        ))}
      </SelectField>
      <DeckSearchField
        label="牌組 B"
        value={input.deck2Id}
        decks={decks}
        onChange={(deck2Id) => patchInput({ deck2Id })}
        showResultsWhenEmpty={false}
      />
      <SelectField label="勝方" value={input.winnerPlayerId} onChange={(winnerPlayerId) => patchInput({ winnerPlayerId })}>
        <option value="">選擇勝方</option>
        {input.player1Id ? <option value={input.player1Id}>{getPlayerName(players, input.player1Id)}</option> : null}
        {input.player2Id ? <option value={input.player2Id}>{getPlayerName(players, input.player2Id)}</option> : null}
      </SelectField>
      <SelectField
        label="先攻"
        value={input.firstPlayerId ?? ''}
        onChange={(firstPlayerId) => patchInput({ firstPlayerId: firstPlayerId || null })}
      >
        <option value="">未記錄</option>
        {input.player1Id ? <option value={input.player1Id}>{getPlayerName(players, input.player1Id)}</option> : null}
        {input.player2Id ? <option value={input.player2Id}>{getPlayerName(players, input.player2Id)}</option> : null}
      </SelectField>
      <label className="block">
        <span className="text-sm text-text-secondary">備註</span>
        <textarea
          className="mt-2 min-h-20 w-full rounded-xl border border-surface-muted bg-surface px-3 py-2 text-text-primary"
          value={input.notes ?? ''}
          onChange={(event) => patchInput({ notes: event.target.value || null })}
        />
      </label>
      {error ? <p className="rounded-xl bg-danger/10 p-3 text-sm text-red-200">{error}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">儲存對局</Button>
      </div>
    </form>
  )
}

function HistoryMatchCard({
  match,
  players,
  decks,
  onEdit,
  onCopy,
  onDelete,
  onRestore,
}: {
  match: Match
  players: Player[]
  decks: Deck[]
  onEdit: () => void
  onCopy: () => void
  onDelete: () => void
  onRestore: () => void
}) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)

  return (
    <article
      className={[
        'rounded-xl bg-surface-elevated ring-1 ring-surface-muted',
        match.deletedAt ? 'opacity-60' : '',
      ].join(' ')}
    >
      <button
        type="button"
        className="block w-full px-3 py-2.5 text-left outline-none"
        onClick={() => setExpanded((value) => !value)}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="shrink-0 text-xs font-semibold text-brand-500">#{match.matchNumber}</span>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs tabular-nums text-text-secondary">
              {formatDateTime(match.finishedAt).split(' ').slice(-1)[0]}
            </span>
            {match.deletedAt ? (
              <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[10px] text-red-100">已刪</span>
            ) : null}
            <span className="text-xs text-brand-400">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
        <div className="mt-1.5 min-w-0">
          <MatchResultRow match={match} players={players} decks={decks} compact bare showResultColors />
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-surface-muted px-3 pb-3 pt-2">
          <p className="text-xs text-text-secondary">完成：{formatDateTime(match.finishedAt)}</p>
          <p className="mt-1 text-xs text-text-secondary">
            先攻：{match.firstPlayerId ? getPlayerName(players, match.firstPlayerId) : '未記錄'}
          </p>
          {match.notes ? <p className="mt-1 text-xs text-text-secondary">備註：{match.notes}</p> : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              className="min-h-9 py-1.5 text-xs"
              disabled={match.deletedAt !== null}
              onClick={onEdit}
            >
              {t('common.edit')}
            </Button>
            <Button
              variant="secondary"
              className="min-h-9 py-1.5 text-xs"
              disabled={match.deletedAt !== null}
              onClick={onCopy}
            >
              複製重開
            </Button>
          </div>
          <div className="mt-2">
            {match.deletedAt ? (
              <Button variant="ghost" className="min-h-9 w-full py-1.5 text-xs" onClick={onRestore}>
                {t('common.restore')}
              </Button>
            ) : (
              <Button variant="danger" className="min-h-9 w-full py-1.5 text-xs" onClick={onDelete}>
                軟刪除
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </article>
  )
}

export function HistoryPage() {
  const { t } = useI18n()
  const toast = useToast()
  const players = useAppStore((state) => state.players)
  const decks = useAppStore((state) => state.decks)
  const matches = useAppStore((state) => state.matches)
  const createActiveMatch = useAppStore((state) => state.createActiveMatch)
  const updateMatch = useAppStore((state) => state.updateMatch)
  const softDeleteMatch = useAppStore((state) => state.softDeleteMatch)
  const restoreMatch = useAppStore((state) => state.restoreMatch)
  const setActiveTab = useAppStore((state) => state.setActiveTab)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [playerFilter, setPlayerFilter] = useState('')
  const [deckFilter, setDeckFilter] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)

  const filteredMatches = useMemo(() => {
    return matches
      .filter((match) => {
        if (!showDeleted && match.deletedAt !== null) return false
        if (dateFilter === 'today' && !isToday(match.finishedAt)) return false
        if (dateFilter === 'week' && !isThisWeek(match.finishedAt)) return false
        if (playerFilter && !matchIncludesPlayer(match, playerFilter)) return false
        if (deckFilter && !matchIncludesDeck(match, deckFilter)) return false
        return true
      })
      .sort((left, right) => {
        return new Date(right.finishedAt).getTime() - new Date(left.finishedAt).getTime()
      })
  }, [dateFilter, deckFilter, matches, playerFilter, showDeleted])

  const copyAsNewMatch = (match: Match) => {
    try {
      createActiveMatch({
        player1Id: match.player1Id,
        deck1Id: match.deck1Id,
        player2Id: match.player2Id,
        deck2Id: match.deck2Id,
        firstPlayerId: match.firstPlayerId,
        notes: match.notes,
      })
      setActiveTab('record')
      toast.success('已複製到進行中對局')
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : '複製對局失敗'
      setMessage(nextMessage)
      toast.error(nextMessage)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-surface-elevated p-4">
        <h2 className="text-lg font-semibold">{t('history.filters')}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-text-secondary">日期</span>
            <select
              className="mt-2 min-h-12 w-full rounded-xl border border-surface-muted bg-surface px-3 text-text-primary"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as DateFilter)}
            >
              <option value="all">全部</option>
              <option value="today">今日</option>
              <option value="week">最近 7 日</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-text-secondary">玩家</span>
            <select
              className="mt-2 min-h-12 w-full rounded-xl border border-surface-muted bg-surface px-3 text-text-primary"
              value={playerFilter}
              onChange={(event) => setPlayerFilter(event.target.value)}
            >
              <option value="">全部玩家</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </label>
          <div className="col-span-2">
            <DeckSearchField
              label="牌組"
              value={deckFilter}
              decks={decks}
              onChange={setDeckFilter}
              placeholder="搜尋要篩選的牌組"
              showResultsWhenEmpty={false}
            />
            {deckFilter ? (
              <Button className="mt-2 min-h-10 py-2 text-sm" variant="ghost" fullWidth onClick={() => setDeckFilter('')}>
                清除牌組篩選
              </Button>
            ) : null}
          </div>
          <label className="flex items-end gap-2 pb-3 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(event) => setShowDeleted(event.target.checked)}
            />
            顯示已刪除
          </label>
        </div>
      </section>

      {message ? (
        <section className="rounded-2xl bg-danger/10 p-4 text-sm text-red-100">
          <div className="flex items-center justify-between gap-3">
            <span>{message}</span>
            <button type="button" className="font-semibold underline" onClick={() => setMessage(null)}>
              關閉
            </button>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('history.completed')}</h2>
          <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-text-secondary">
            {filteredMatches.length} 場
          </span>
        </div>

        {filteredMatches.length ? (
          filteredMatches.map((match) => (
            <HistoryMatchCard
              key={match.id}
              match={match}
              players={players}
              decks={decks}
              onEdit={() => setEditingMatch(match)}
              onCopy={() => copyAsNewMatch(match)}
              onDelete={() => {
                softDeleteMatch(match.id)
                toast.success('對局已刪除')
              }}
              onRestore={() => {
                restoreMatch(match.id)
                toast.success('對局已還原')
              }}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-surface-muted p-4 text-center text-sm text-text-secondary">
            暫時沒有符合篩選的完成對局。
          </div>
        )}
      </section>

      <BottomSheet open={editingMatch !== null} title="編輯完成對局" onClose={() => setEditingMatch(null)}>
        {editingMatch ? (
          <EditMatchForm
            match={editingMatch}
            players={players}
            decks={decks}
            onCancel={() => setEditingMatch(null)}
            onSave={(input) => {
              updateMatch(editingMatch.id, input)
              setEditingMatch(null)
              toast.success('對局已更新')
            }}
          />
        ) : null}
      </BottomSheet>
    </div>
  )
}
