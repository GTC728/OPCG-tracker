import { useEffect, useMemo, useRef, useState } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { useI18n } from '@/lib/i18n'
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
  placeholder,
  emptyLabel,
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
  const { t } = useI18n()
  const selectedDeck = getDeck(decks, value)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)

  const preferredDecks = preferredDeckIds
    .map((deckId) => getDeck(decks, deckId))
    .filter((deck): deck is Deck => Boolean(deck))

  const panelDecks = useMemo(() => {
    if (query.trim()) {
      return decks.filter((deck) => deckMatchesSearch(deck, query)).slice(0, 30)
    }
    if (preferredDecks.length) return preferredDecks
    if (showResultsWhenEmpty) return decks.slice(0, 30)
    return []
  }, [decks, preferredDecks, query, showResultsWhenEmpty])

  const panelLabel = query.trim()
    ? t('deck.searchResults')
    : preferredDecks.length
      ? t('deck.recentUsed')
      : showResultsWhenEmpty
        ? t('deck.allLeaders')
        : ''

  const openSearch = () => {
    setPanelOpen(true)
    setQuery('')
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  const selectDeck = (deck: Deck) => {
    onChange(deck.id)
    setQuery('')
    setPanelOpen(false)
  }

  const clearSelection = () => {
    onChange('')
    setQuery('')
    setPanelOpen(true)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  useEffect(() => {
    if (!panelOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return
      setPanelOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [panelOpen])

  const showInput = panelOpen || !selectedDeck

  return (
    <div ref={rootRef}>
      <span className="text-sm font-medium text-text-secondary">{label}</span>
      {showInput ? (
        <input
          ref={inputRef}
          className="mt-2 min-h-12 w-full rounded-xl border border-surface-muted bg-surface px-4 py-3 text-base text-text-primary outline-none transition focus:border-brand-500"
          placeholder={placeholder ?? t('deck.searchPlaceholder')}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setPanelOpen(true)
          }}
          onFocus={() => setPanelOpen(true)}
        />
      ) : (
        <div className="mt-2 flex min-h-12 items-center gap-2 rounded-xl border border-brand-500/40 bg-brand-500/10 px-3 py-2">
          <button
            type="button"
            className="min-w-0 flex-1 text-left text-sm font-semibold text-brand-100"
            onClick={openSearch}
          >
            <DeckLabel deck={selectedDeck} />
          </button>
          <button
            type="button"
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-text-secondary hover:bg-surface-muted"
            onClick={clearSelection}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>
      )}
      {panelOpen && panelLabel ? (
        <div className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-surface-muted bg-surface p-2">
          <p className="px-2 py-1 text-[11px] font-semibold text-text-secondary">{panelLabel}</p>
          {panelDecks.length ? (
            panelDecks.map((deck) => (
              <button
                key={deck.id}
                type="button"
                className={[
                  'w-full rounded-lg px-3 py-2 text-left text-sm transition',
                  value === deck.id ? 'bg-brand-600 text-white' : 'hover:bg-surface-muted',
                ].join(' ')}
                onClick={() => selectDeck(deck)}
              >
                <DeckLabel deck={deck} />
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-text-secondary">{emptyLabel ?? t('deck.searchEmpty')}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
