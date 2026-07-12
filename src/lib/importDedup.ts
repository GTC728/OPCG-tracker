import { normalizeImportName } from '@/lib/importSafety'
import type { ImportMatchInput, Match, Player, Deck } from '@/types'

/** Stable fingerprint for import dedup (date bucket + roster + winner). */
export function importRowFingerprint(row: ImportMatchInput): string {
  const date = row.date?.trim() ? new Date(row.date).toISOString().slice(0, 10) : ''
  return [
    date,
    normalizeImportName(row.player1Name),
    normalizeImportName(row.player2Name),
    normalizeImportName(row.deck1Query),
    normalizeImportName(row.deck2Query),
    normalizeImportName(row.winnerName),
  ].join('\u0001')
}

function playerNameById(players: Player[], id: string): string {
  return players.find((p) => p.id === id)?.name ?? id
}

function deckQueryById(decks: Deck[], id: string): string {
  const deck = decks.find((d) => d.id === id)
  if (!deck) return id
  return deck.displayName || deck.leaderName || id
}

export function matchFingerprint(
  match: Match,
  players: Player[],
  decks: Deck[],
): string {
  const date = match.startedAt ? new Date(match.startedAt).toISOString().slice(0, 10) : ''
  const winnerName = playerNameById(players, match.winnerPlayerId)
  return [
    date,
    normalizeImportName(playerNameById(players, match.player1Id)),
    normalizeImportName(playerNameById(players, match.player2Id)),
    normalizeImportName(deckQueryById(decks, match.deck1Id)),
    normalizeImportName(deckQueryById(decks, match.deck2Id)),
    normalizeImportName(winnerName),
  ].join('\u0001')
}

export function buildExistingMatchFingerprints(
  matches: Match[],
  players: Player[],
  decks: Deck[],
): Set<string> {
  const set = new Set<string>()
  for (const match of matches) {
    if (match.deletedAt !== null) continue
    set.add(matchFingerprint(match, players, decks))
  }
  return set
}

export function partitionImportRows(
  rows: ImportMatchInput[],
  existingFingerprints: Set<string>,
): { unique: ImportMatchInput[]; duplicateCount: number } {
  const seen = new Set(existingFingerprints)
  const unique: ImportMatchInput[] = []
  let duplicateCount = 0

  for (const row of rows) {
    const fp = importRowFingerprint(row)
    if (seen.has(fp)) {
      duplicateCount += 1
      continue
    }
    seen.add(fp)
    unique.push(row)
  }

  return { unique, duplicateCount }
}

export function countImportDuplicates(
  rows: ImportMatchInput[],
  matches: Match[],
  players: Player[],
  decks: Deck[],
): number {
  const existing = buildExistingMatchFingerprints(matches, players, decks)
  return partitionImportRows(rows, existing).duplicateCount
}
