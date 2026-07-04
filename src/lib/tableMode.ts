import type { ActiveMatch, AppState } from '@/types'

export const DEFAULT_TABLE_COUNT = 2
export const MAX_TABLE_COUNT = 32

export function getSessionTableCount(state: AppState, sessionId: string): number {
  const configured = state.settings.sessionTableCounts[sessionId]
  if (configured && configured >= 1) return Math.min(configured, MAX_TABLE_COUNT)

  const usedSlots = state.activeMatches
    .filter((match) => match.sessionId === sessionId && match.tableSlot !== null)
    .map((match) => match.tableSlot as number)

  if (usedSlots.length) {
    return Math.min(Math.max(DEFAULT_TABLE_COUNT, ...usedSlots), MAX_TABLE_COUNT)
  }

  return DEFAULT_TABLE_COUNT
}

export function getActiveMatchForTableSlot(
  activeMatches: ActiveMatch[],
  sessionId: string,
  tableSlot: number,
): ActiveMatch | undefined {
  return activeMatches.find(
    (match) => match.sessionId === sessionId && match.tableSlot === tableSlot,
  )
}

export type TableDragPayload =
  | { kind: 'player'; playerId: string }
  | { kind: 'deck'; deckId: string }

export function encodeTableDragPayload(payload: TableDragPayload): string {
  return JSON.stringify(payload)
}

export function decodeTableDragPayload(raw: string): TableDragPayload | null {
  try {
    const parsed = JSON.parse(raw) as TableDragPayload
    if (parsed?.kind === 'player' && typeof parsed.playerId === 'string') return parsed
    if (parsed?.kind === 'deck' && typeof parsed.deckId === 'string') return parsed
    return null
  } catch {
    return null
  }
}

export function findFirstEmptyTableSlot(state: AppState, sessionId: string): number | null {
  const count = getSessionTableCount(state, sessionId)
  for (let slot = 1; slot <= count; slot += 1) {
    if (!getActiveMatchForTableSlot(state.activeMatches, sessionId, slot)) return slot
  }
  return null
}

export type PendingTableAssignment =
  | { kind: 'player'; playerId: string }
  | { kind: 'deck'; deckId: string }

export type PendingTableTarget = {
  slot: number
  side: 'left' | 'right'
  field: 'player' | 'deck'
}
