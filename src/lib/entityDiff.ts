import type { ActiveMatch, Match, Player, Session } from '@/types'

export type EntityDiffCode =
  | 'winnerChanged'
  | 'playersChanged'
  | 'decksChanged'
  | 'turnOrderChanged'
  | 'finishTimeChanged'
  | 'notesChanged'
  | 'deleteStateChanged'
  | 'archiveStateChanged'
  | 'nameChanged'
  | 'profileLinkChanged'
  | 'aliasesChanged'
  | 'startTimeChanged'
  | 'endTimeChanged'
  | 'tableSlotChanged'
  | 'fieldsUpdated'

export function summarizeMatchDiffCodes(left: Match, right: Match): EntityDiffCode[] {
  const lines: EntityDiffCode[] = []
  if (left.winnerPlayerId !== right.winnerPlayerId) lines.push('winnerChanged')
  if (left.player1Id !== right.player1Id || left.player2Id !== right.player2Id) {
    lines.push('playersChanged')
  }
  if (left.deck1Id !== right.deck1Id || left.deck2Id !== right.deck2Id) lines.push('decksChanged')
  if (left.firstPlayerId !== right.firstPlayerId) lines.push('turnOrderChanged')
  if (left.finishedAt !== right.finishedAt) lines.push('finishTimeChanged')
  if (left.notes !== right.notes) lines.push('notesChanged')
  if (left.deletedAt !== right.deletedAt) lines.push('deleteStateChanged')
  return lines.length ? lines : ['fieldsUpdated']
}

export function summarizePlayerDiffCodes(left: Player, right: Player): EntityDiffCode[] {
  const lines: EntityDiffCode[] = []
  if (left.name !== right.name) lines.push('nameChanged')
  if (left.archived !== right.archived) lines.push('archiveStateChanged')
  if (left.deletedAt !== right.deletedAt) lines.push('deleteStateChanged')
  if (left.linkedUserId !== right.linkedUserId) lines.push('profileLinkChanged')
  if (left.aliases.join('\u0000') !== right.aliases.join('\u0000')) lines.push('aliasesChanged')
  return lines.length ? lines : ['fieldsUpdated']
}

export function summarizeSessionDiffCodes(left: Session, right: Session): EntityDiffCode[] {
  const lines: EntityDiffCode[] = []
  if (left.name !== right.name) lines.push('nameChanged')
  if (left.startedAt !== right.startedAt) lines.push('startTimeChanged')
  if (left.endedAt !== right.endedAt) lines.push('endTimeChanged')
  if (left.archivedAt !== right.archivedAt) lines.push('archiveStateChanged')
  if (left.deletedAt !== right.deletedAt) lines.push('deleteStateChanged')
  return lines.length ? lines : ['fieldsUpdated']
}

export function summarizeActiveDiffCodes(left: ActiveMatch, right: ActiveMatch): EntityDiffCode[] {
  const lines: EntityDiffCode[] = []
  if (left.player1Id !== right.player1Id || left.player2Id !== right.player2Id) {
    lines.push('playersChanged')
  }
  if (left.deck1Id !== right.deck1Id || left.deck2Id !== right.deck2Id) lines.push('decksChanged')
  if (left.tableSlot !== right.tableSlot) lines.push('tableSlotChanged')
  if (left.firstPlayerId !== right.firstPlayerId) lines.push('turnOrderChanged')
  if (left.notes !== right.notes) lines.push('notesChanged')
  return lines.length ? lines : ['fieldsUpdated']
}

export function summarizePartialMatchDiffCodes(before: Partial<Match>, after: Partial<Match>): EntityDiffCode[] {
  const lines: EntityDiffCode[] = []
  if (before.winnerPlayerId !== after.winnerPlayerId) lines.push('winnerChanged')
  if (before.player1Id !== after.player1Id || before.player2Id !== after.player2Id) {
    lines.push('playersChanged')
  }
  if (before.deck1Id !== after.deck1Id || before.deck2Id !== after.deck2Id) lines.push('decksChanged')
  if (before.firstPlayerId !== after.firstPlayerId) lines.push('turnOrderChanged')
  if (before.notes !== after.notes) lines.push('notesChanged')
  return lines.length ? lines : ['fieldsUpdated']
}
