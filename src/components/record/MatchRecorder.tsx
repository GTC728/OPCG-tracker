import { useMemo, useState } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { DeckSearchField } from '@/components/deck/DeckSearchField'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/lib/i18n'
import { formatDateTime } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'
import type { ActiveMatch, ActiveMatchInput, Deck, Match, Player, RecentCombo } from '@/types'

const emptyMatchInput: ActiveMatchInput = {
  player1Id: '',
  deck1Id: '',
  player2Id: '',
  deck2Id: '',
  firstPlayerId: null,
  notes: null,
}

function getPlayer(players: Player[], id: string): Player | undefined {
  return players.find((player) => player.id === id)
}

function getDeck(decks: Deck[], id: string): Deck | undefined {
  return decks.find((deck) => deck.id === id)
}

function getPlayerName(players: Player[], id: string): string {
  return getPlayer(players, id)?.name ?? '未知玩家'
}

function getRecentCombos(matches: Match[], players: Player[], decks: Deck[]): RecentCombo[] {
  const activePlayers = new Set(players.filter((player) => !player.archived).map((player) => player.id))
  const activeDecks = new Set(decks.filter((deck) => !deck.archived).map((deck) => deck.id))
  const seen = new Set<string>()
  const combos: RecentCombo[] = []

  for (const match of matches) {
    if (match.deletedAt !== null) continue
    if (
      !activePlayers.has(match.player1Id) ||
      !activePlayers.has(match.player2Id) ||
      !activeDecks.has(match.deck1Id) ||
      !activeDecks.has(match.deck2Id)
    ) {
      continue
    }

    const key = [match.player1Id, match.deck1Id, match.player2Id, match.deck2Id].join(':')
    if (seen.has(key)) continue

    seen.add(key)
    combos.push({
      player1Id: match.player1Id,
      deck1Id: match.deck1Id,
      player2Id: match.player2Id,
      deck2Id: match.deck2Id,
      lastUsedAt: match.finishedAt,
    })

    if (combos.length >= 5) break
  }

  return combos
}

function getRecentDeckIdsForPlayer(matches: Match[], playerId: string): string[] {
  const seen = new Set<string>()
  const deckIds: string[] = []

  for (const match of matches) {
    if (match.deletedAt !== null) continue

    const deckId =
      match.player1Id === playerId
        ? match.deck1Id
        : match.player2Id === playerId
          ? match.deck2Id
          : null

    if (!deckId || seen.has(deckId)) continue

    seen.add(deckId)
    deckIds.push(deckId)
    if (deckIds.length >= 4) break
  }

  return deckIds
}

function PlayerChip({
  player,
  active,
  onClick,
}: {
  player: Player
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={[
        'min-h-12 rounded-2xl px-4 py-3 text-sm font-semibold transition',
        active ? 'bg-brand-600 text-white' : 'bg-surface text-text-primary ring-1 ring-surface-muted',
      ].join(' ')}
      onClick={onClick}
    >
      {player.name}
    </button>
  )
}

function MatchSideCard({
  label,
  playerId,
  deckId,
  players,
  decks,
  preferredDeckIds,
  onPlayerChange,
  onDeckChange,
}: {
  label: string
  playerId: string
  deckId: string
  players: Player[]
  decks: Deck[]
  preferredDeckIds: string[]
  onPlayerChange: (playerId: string) => void
  onDeckChange: (deckId: string) => void
}) {
  return (
    <section className="rounded-2xl bg-surface p-4 ring-1 ring-surface-muted">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-brand-500">{label}</p>
        <div className="rounded-full bg-surface-muted px-3 py-1 text-xs text-text-secondary">
          <DeckLabel deck={getDeck(decks, deckId)} />
        </div>
      </div>
      <div className="mt-3">
        <p className="mb-2 text-sm font-semibold text-text-secondary">玩家</p>
        <div className="flex flex-wrap gap-2">
          {players.map((player) => (
            <PlayerChip
              key={player.id}
              player={player}
              active={playerId === player.id}
              onClick={() => onPlayerChange(player.id)}
            />
          ))}
        </div>
      </div>
      <div className="mt-4">
        <DeckSearchField
          label="牌組"
          value={deckId}
          decks={decks}
          preferredDeckIds={preferredDeckIds}
          onChange={onDeckChange}
        />
      </div>
    </section>
  )
}

function MatchForm({
  initial,
  players,
  decks,
  matches,
  onCancel,
  onSave,
}: {
  initial?: ActiveMatchInput
  players: Player[]
  decks: Deck[]
  matches: Match[]
  onCancel: () => void
  onSave: (input: ActiveMatchInput) => void
}) {
  const [input, setInput] = useState<ActiveMatchInput>(initial ?? emptyMatchInput)
  const [error, setError] = useState<string | null>(null)
  const canSubmit = Boolean(input.player1Id && input.player2Id && input.deck1Id && input.deck2Id)

  const updateInput = (patch: Partial<ActiveMatchInput>) => {
    setInput((current) => {
      const next = { ...current, ...patch }
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
  const swapPlayers = () => {
    setInput((current) => ({
      ...current,
      player1Id: current.player2Id,
      deck1Id: current.deck2Id,
      player2Id: current.player1Id,
      deck2Id: current.deck1Id,
    }))
  }
  const rollFirstPlayer = () => {
    if (!input.player1Id || !input.player2Id) return
    updateInput({ firstPlayerId: Math.random() < 0.5 ? input.player1Id : input.player2Id })
  }
  const choosePlayer = (slot: 'player1' | 'player2', playerId: string) => {
    const recentDeckId = getRecentDeckIdsForPlayer(matches, playerId)[0] ?? ''
    setInput((current) => ({
      ...current,
      ...(slot === 'player1'
        ? { player1Id: playerId, deck1Id: recentDeckId || current.deck1Id }
        : { player2Id: playerId, deck2Id: recentDeckId || current.deck2Id }),
    }))
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!canSubmit) {
          setError('請先選好兩位玩家和兩副牌組')
          return
        }
        try {
          onSave(input)
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : '建立對局失敗')
        }
      }}
    >
      <div className="rounded-2xl bg-brand-500/10 p-4 ring-1 ring-brand-500/30">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">New Match</p>
        <p className="mt-1 text-sm text-text-secondary">先選玩家，再選牌組；完成後直接建立進行中對局。</p>
      </div>

      <MatchSideCard
        label="Player A"
        playerId={input.player1Id}
        deckId={input.deck1Id}
        players={players}
        decks={decks}
        preferredDeckIds={getRecentDeckIdsForPlayer(matches, input.player1Id)}
        onPlayerChange={(playerId) => choosePlayer('player1', playerId)}
        onDeckChange={(deck1Id) => updateInput({ deck1Id })}
      />

      <MatchSideCard
        label="Player B"
        playerId={input.player2Id}
        deckId={input.deck2Id}
        players={players}
        decks={decks}
        preferredDeckIds={getRecentDeckIdsForPlayer(matches, input.player2Id)}
        onPlayerChange={(playerId) => choosePlayer('player2', playerId)}
        onDeckChange={(deck2Id) => updateInput({ deck2Id })}
      />

      <section className="rounded-2xl bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-brand-500">先攻</p>
          <Button type="button" className="min-h-10 py-2 text-sm" variant="ghost" onClick={swapPlayers}>
            交換 A / B
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" className="min-h-10 py-2 text-sm" onClick={rollFirstPlayer}>
            隨機
          </Button>
          <Button
            type="button"
            variant={input.firstPlayerId === null ? 'primary' : 'ghost'}
            className="min-h-10 py-2 text-sm"
            onClick={() => updateInput({ firstPlayerId: null })}
          >
            稍後決定
          </Button>
          <Button
            type="button"
            variant={input.firstPlayerId === input.player1Id ? 'primary' : 'ghost'}
            className="min-h-10 py-2 text-sm"
            disabled={!input.player1Id}
            onClick={() => updateInput({ firstPlayerId: input.player1Id })}
          >
            A 先攻
          </Button>
          <Button
            type="button"
            variant={input.firstPlayerId === input.player2Id ? 'primary' : 'ghost'}
            className="min-h-10 py-2 text-sm"
            disabled={!input.player2Id}
            onClick={() => updateInput({ firstPlayerId: input.player2Id })}
          >
            B 先攻
          </Button>
        </div>
      </section>

      <label className="block">
        <span className="text-sm font-medium text-text-secondary">備註</span>
        <textarea
          className="mt-2 min-h-20 w-full rounded-xl border border-surface-muted bg-surface px-4 py-3 text-base text-text-primary outline-none transition focus:border-brand-500"
          placeholder="可留空"
          value={input.notes ?? ''}
          onChange={(event) => updateInput({ notes: event.target.value || null })}
        />
      </label>

      {error ? <p className="rounded-xl bg-danger/10 p-3 text-sm text-red-200">{error}</p> : null}

      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          確認建立
        </Button>
      </div>
    </form>
  )
}

function matchToInput(match: Match, swap = false): ActiveMatchInput {
  return {
    player1Id: swap ? match.player2Id : match.player1Id,
    deck1Id: swap ? match.deck2Id : match.deck1Id,
    player2Id: swap ? match.player1Id : match.player2Id,
    deck2Id: swap ? match.deck1Id : match.deck2Id,
    firstPlayerId: null,
    notes: match.notes,
  }
}

function LastCompletedCard({
  match,
  players,
  decks,
  onRematch,
  onSwapRematch,
}: {
  match: Match
  players: Player[]
  decks: Deck[]
  onRematch: () => void
  onSwapRematch: () => void
}) {
  return (
    <section className="rounded-2xl bg-brand-500/10 p-4 ring-1 ring-brand-500/30">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">剛完成</p>
      <p className="mt-2 flex flex-wrap items-center gap-2 font-semibold">
        <span>{getPlayerName(players, match.player1Id)}</span>
        <span>+</span>
        <DeckLabel deck={getDeck(decks, match.deck1Id)} />
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
        <span>vs {getPlayerName(players, match.player2Id)}</span>
        <span>+</span>
        <DeckLabel deck={getDeck(decks, match.deck2Id)} />
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button className="min-h-10 py-2 text-sm" variant="secondary" onClick={onRematch}>
          再打一場
        </Button>
        <Button className="min-h-10 py-2 text-sm" variant="ghost" onClick={onSwapRematch}>
          交換再打
        </Button>
      </div>
    </section>
  )
}

function ActiveMatchCard({
  match,
  players,
  decks,
  onComplete,
  onSetFirstPlayer,
}: {
  match: ActiveMatch
  players: Player[]
  decks: Deck[]
  onComplete: (winnerPlayerId: string) => void
  onSetFirstPlayer: (firstPlayerId: string | null) => void
}) {
  const rollFirstPlayer = () => {
    const firstPlayerId = Math.random() < 0.5 ? match.player1Id : match.player2Id
    onSetFirstPlayer(firstPlayerId)
  }

  return (
    <article className="rounded-2xl bg-surface-elevated p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
            對局 {match.matchNumber}
          </p>
          <p className="mt-1 text-sm text-text-secondary">開始：{formatDateTime(match.startedAt)}</p>
        </div>
        {match.firstPlayerId ? (
          <span className="rounded-full bg-surface-muted px-3 py-1 text-xs text-text-secondary">
            先攻：{getPlayerName(players, match.firstPlayerId)}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button variant="secondary" className="min-h-10 py-2 text-sm" onClick={rollFirstPlayer}>
          擲骰先攻
        </Button>
        <Button
          variant={match.firstPlayerId === match.player1Id ? 'primary' : 'ghost'}
          className="min-h-10 py-2 text-sm"
          onClick={() => onSetFirstPlayer(match.player1Id)}
        >
          A 先
        </Button>
        <Button
          variant={match.firstPlayerId === match.player2Id ? 'primary' : 'ghost'}
          className="min-h-10 py-2 text-sm"
          onClick={() => onSetFirstPlayer(match.player2Id)}
        >
          B 先
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-2xl ring-1 ring-surface-muted">
        <button
          type="button"
          className="min-h-40 bg-surface p-4 text-left transition hover:bg-green-950/40 active:bg-green-900/50"
          onClick={() => onComplete(match.player1Id)}
        >
          <p className="text-xl font-bold">{getPlayerName(players, match.player1Id)}</p>
          <p className="mt-2 text-sm text-text-secondary">
            <DeckLabel deck={getDeck(decks, match.deck1Id)} />
          </p>
          <p className="mt-8 text-center text-3xl font-black text-success">WIN</p>
        </button>
        <button
          type="button"
          className="min-h-40 border-l border-surface-muted bg-surface p-4 text-left transition hover:bg-green-950/40 active:bg-green-900/50"
          onClick={() => onComplete(match.player2Id)}
        >
          <p className="text-xl font-bold">{getPlayerName(players, match.player2Id)}</p>
          <p className="mt-2 text-sm text-text-secondary">
            <DeckLabel deck={getDeck(decks, match.deck2Id)} />
          </p>
          <p className="mt-8 text-center text-3xl font-black text-success">WIN</p>
        </button>
      </div>
    </article>
  )
}

function RecentComboCard({
  combo,
  players,
  decks,
  onRestart,
}: {
  combo: RecentCombo
  players: Player[]
  decks: Deck[]
  onRestart: () => void
}) {
  return (
    <button
      type="button"
      className="w-full rounded-2xl bg-surface p-4 text-left ring-1 ring-surface-muted transition hover:bg-surface-muted"
      onClick={onRestart}
    >
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        <span>{getPlayerName(players, combo.player1Id)}</span>
        <span>+</span>
        <DeckLabel deck={getDeck(decks, combo.deck1Id)} />
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
        <span>vs {getPlayerName(players, combo.player2Id)}</span>
        <span>+</span>
        <DeckLabel deck={getDeck(decks, combo.deck2Id)} />
      </p>
      <p className="mt-2 text-xs text-text-secondary">最近：{formatDateTime(combo.lastUsedAt)}</p>
    </button>
  )
}

export function MatchRecorder() {
  const { t } = useI18n()
  const toast = useToast()
  const players = useAppStore((state) => state.players)
  const decks = useAppStore((state) => state.decks)
  const matches = useAppStore((state) => state.matches)
  const activeMatches = useAppStore((state) => state.activeMatches)
  const currentSessionId = useAppStore((state) => state.currentSessionId)
  const createActiveMatch = useAppStore((state) => state.createActiveMatch)
  const setActiveMatchFirstPlayer = useAppStore((state) => state.setActiveMatchFirstPlayer)
  const completeActiveMatch = useAppStore((state) => state.completeActiveMatch)
  const undoCompletedMatch = useAppStore((state) => state.undoCompletedMatch)
  const setActiveTab = useAppStore((state) => state.setActiveTab)
  const [sheetInput, setSheetInput] = useState<ActiveMatchInput | null>(null)
  const [lastCompletedMatch, setLastCompletedMatch] = useState<Match | null>(null)

  const activePlayers = players.filter((player) => !player.archived)
  const activeDecks = decks.filter((deck) => !deck.archived)
  const sessionActiveMatches = activeMatches.filter((match) => match.sessionId === currentSessionId)
  const recentCombos = useMemo(
    () => getRecentCombos(matches, players, decks),
    [decks, matches, players],
  )
  const canCreateMatch = activePlayers.length >= 2 && activeDecks.length >= 1

  return (
    <>
      <section className="rounded-2xl bg-surface-elevated p-4">
        <Button fullWidth disabled={!canCreateMatch} onClick={() => setSheetInput(emptyMatchInput)}>
          {t('record.newMatch')}
        </Button>
        {!canCreateMatch ? (
          <div className="mt-3 rounded-xl bg-warning/10 p-3 text-sm text-yellow-100">
            需要至少 2 位未封存玩家和 1 副未封存牌組。
            <button
              type="button"
              className="ml-2 font-semibold underline"
              onClick={() => setActiveTab('settings')}
            >
              去設定
            </button>
          </div>
        ) : null}
      </section>

      {lastCompletedMatch ? (
        <LastCompletedCard
          match={lastCompletedMatch}
          players={players}
          decks={decks}
          onRematch={() => setSheetInput(matchToInput(lastCompletedMatch))}
          onSwapRematch={() => setSheetInput(matchToInput(lastCompletedMatch, true))}
        />
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('record.active')}</h2>
          <span className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-text-secondary">
            {sessionActiveMatches.length} 場
          </span>
        </div>
        {sessionActiveMatches.length ? (
          sessionActiveMatches.map((match) => (
            <ActiveMatchCard
              key={match.id}
              match={match}
              players={players}
              decks={decks}
              onComplete={(winnerPlayerId) => {
                const completed = completeActiveMatch(match.id, winnerPlayerId)
                setLastCompletedMatch(completed)
                toast.showToast({
                  type: 'success',
                  message: '已記錄對局',
                  actionLabel: '復原',
                  onAction: () => undoCompletedMatch(completed.id),
                })
              }}
              onSetFirstPlayer={(firstPlayerId) => {
                setActiveMatchFirstPlayer(match.id, firstPlayerId)
                toast.info(firstPlayerId ? `已設定先攻：${getPlayerName(players, firstPlayerId)}` : '已清除先攻')
              }}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-surface-muted p-4 text-center text-sm text-text-secondary">
            目前沒有進行中對局。
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('record.recentCombos')}</h2>
        {recentCombos.length ? (
          recentCombos.map((combo) => (
            <RecentComboCard
              key={[combo.player1Id, combo.deck1Id, combo.player2Id, combo.deck2Id].join(':')}
              combo={combo}
              players={players}
              decks={decks}
              onRestart={() =>
                setSheetInput({
                  player1Id: combo.player1Id,
                  deck1Id: combo.deck1Id,
                  player2Id: combo.player2Id,
                  deck2Id: combo.deck2Id,
                  firstPlayerId: null,
                  notes: null,
                })
              }
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-surface-muted p-4 text-center text-sm text-text-secondary">
            完成第一場對局後，這裡會出現最近組合。
          </div>
        )}
      </section>

      <BottomSheet
        open={sheetInput !== null}
        title={sheetInput === emptyMatchInput ? '新對局' : '確認重開對局'}
        onClose={() => setSheetInput(null)}
      >
        <MatchForm
          initial={sheetInput ?? emptyMatchInput}
          players={activePlayers}
          decks={activeDecks}
          matches={matches}
          onCancel={() => setSheetInput(null)}
          onSave={(input) => {
            createActiveMatch(input)
            setSheetInput(null)
            toast.success('已建立新對局')
          }}
        />
      </BottomSheet>
    </>
  )
}
