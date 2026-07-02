import { useMemo, useState } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import type { Deck } from '@/types'

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().replace(/[-_\s.]/g, '')
}

function deckMatchesSearch(deck: Deck, query: string): boolean {
  const normalizedQuery = normalizeSearch(query)
  if (!normalizedQuery) return true

  const candidates = [
    deck.displayName,
    deck.setCode,
    deck.leaderCode,
    deck.leaderName,
    ...deck.colors,
    ...deck.aliases,
  ]

  return candidates.some((candidate) => normalizeSearch(candidate).includes(normalizedQuery))
}

function getDeck(decks: Deck[], id: string): Deck | undefined {
  return decks.find((deck) => deck.id === id)
}

export function DeckSearchField({
  label,
  value,
  decks,
  preferredDeckIds = [],
  onChange,
  placeholder = '搜尋 OP / ST / EB / Leader 名稱',
  emptyLabel = '沒有符合的 Leader',
  showResultsWhenEmpty = true,
}: {
  label: string
  value: string
  decks: Deck[]
  preferredDeckIds?: string[]
  onChange: (value: string) => void
  placeholder?: string
  emptyLabel?: string
  showResultsWhenEmpty?: boolean
}) {
  const selectedDeck = getDeck(decks, value)
  const [query, setQuery] = useState(selectedDeck?.leaderName ?? '')
  const shouldShowResults = showResultsWhenEmpty || query.trim().length > 0
  const preferredDecks = preferredDeckIds
    .map((deckId) => getDeck(decks, deckId))
    .filter((deck): deck is Deck => Boolean(deck))
  const visibleDecks = useMemo(
    () => decks.filter((deck) => deckMatchesSearch(deck, query)).slice(0, 30),
    [decks, query],
  )

  return (
    <div>
      <span className="text-sm font-medium text-text-secondary">{label}</span>
      <input
        className="mt-2 min-h-12 w-full rounded-xl border border-surface-muted bg-surface px-4 py-3 text-base text-text-primary outline-none transition focus:border-brand-500"
        placeholder={placeholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {selectedDeck ? (
        <p className="mt-2 rounded-xl bg-brand-500/15 px-3 py-2 text-sm font-semibold text-brand-100">
          已選：<DeckLabel deck={selectedDeck} />
        </p>
      ) : null}
      {preferredDecks.length ? (
        <div className="mt-2">
          <p className="mb-2 text-xs font-semibold text-text-secondary">推薦 / 最近使用</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {preferredDecks.map((deck) => (
              <button
                key={deck.id}
                type="button"
                className="shrink-0 rounded-full bg-surface-muted px-3 py-2 text-xs font-semibold text-text-primary"
                onClick={() => {
                  onChange(deck.id)
                  setQuery(deck.leaderName)
                }}
              >
                <DeckLabel deck={deck} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {shouldShowResults ? (
      <div className="mt-2 max-h-52 space-y-2 overflow-y-auto rounded-xl border border-surface-muted bg-surface p-2">
        <p className="px-2 py-1 text-xs font-semibold text-text-secondary">
          {query.trim() ? '搜尋結果' : '全部 Leader'}
        </p>
        {visibleDecks.length ? (
          visibleDecks.map((deck) => (
            <button
              key={deck.id}
              type="button"
              className={[
                'w-full rounded-lg px-3 py-2 text-left text-sm transition',
                value === deck.id ? 'bg-brand-600 text-white' : 'hover:bg-surface-muted',
              ].join(' ')}
              onClick={() => {
                onChange(deck.id)
                setQuery(deck.leaderName)
              }}
            >
              <span className="block font-semibold">
                <DeckLabel deck={deck} />
              </span>
              <span className="mt-1 block text-xs opacity-75">{deck.leaderCode}</span>
            </button>
          ))
        ) : (
          <p className="px-3 py-2 text-sm text-text-secondary">{emptyLabel}</p>
        )}
      </div>
      ) : null}
    </div>
  )
}
