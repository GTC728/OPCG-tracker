export type ResultType = 'normal' | 'draw' | 'forfeit'
export type MatchSource = 'manual' | 'import' | 'manual_edit'
export type Language = 'zh' | 'en' | 'ja'

export interface Player {
  id: string
  name: string
  aliases: string[]
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface PlayerInput {
  name: string
  aliases: string[]
}

export interface Deck {
  id: string
  setCode: string
  leaderCode: string
  leaderName: string
  colors: string[]
  displayName: string
  aliases: string[]
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface Leader {
  id: string
  code: string
  setCode: string
  name: string
  colors: string[]
  traits: string[]
  source: 'seed' | 'manual' | 'import'
  updatedAt: string
}

export interface DeckVariant {
  id: string
  leaderId: string
  name: string
  ownerPlayerId: string | null
  aliases: string[]
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface DeckInput {
  setCode: string
  leaderCode: string
  leaderName: string
  colors: string[]
  displayName: string
  aliases: string[]
}

export interface Session {
  id: string
  name: string
  startedAt: string
  endedAt: string | null
  createdAt: string
}

export interface PlayerAlias {
  id: string
  playerId: string
  alias: string
  source: 'manual' | 'import' | 'merge'
}

export interface SessionPlayer {
  sessionId: string
  playerId: string
  defaultDeckVariantId: string | null
}

export interface SessionDeck {
  sessionId: string
  deckVariantId: string
}

export interface ActiveMatch {
  id: string
  sessionId: string
  matchNumber: number
  player1Id: string
  deck1Id: string
  player2Id: string
  deck2Id: string
  firstPlayerId: string | null
  startedAt: string
  notes: string | null
}

export interface ActiveMatchInput {
  player1Id: string
  deck1Id: string
  player2Id: string
  deck2Id: string
  firstPlayerId: string | null
  notes: string | null
}

export interface Match {
  id: string
  sessionId: string
  matchNumber: number
  player1Id: string
  deck1Id: string
  player2Id: string
  deck2Id: string
  winnerPlayerId: string
  winnerDeckId: string
  firstPlayerId: string | null
  resultType: ResultType
  startedAt: string
  finishedAt: string
  source: MatchSource
  deletedAt: string | null
  notes: string | null
}

export interface MatchRevision {
  id: string
  matchId: string
  editedAt: string
  before: Partial<Match>
  after: Partial<Match>
  reason: string | null
}

export interface MatchEditInput {
  player1Id: string
  deck1Id: string
  player2Id: string
  deck2Id: string
  winnerPlayerId: string
  firstPlayerId: string | null
  notes: string | null
}

export interface ImportRecord {
  id: string
  filename: string
  importedAt: string
  totalRows: number
  successCount: number
  errorCount: number
  errors: Array<{ row: number; message: string }>
  rawData: string
}

export interface ImportBatch {
  id: string
  filename: string
  importedAt: string
  schemaVersion: number
  totalRows: number
  successCount: number
  errorCount: number
  rawFileHash: string
}

export interface ImportRow {
  id: string
  batchId: string
  rowNumber: number
  raw: Record<string, string>
  status: 'pending' | 'imported' | 'error' | 'ignored'
  errorMessage: string | null
  matchId: string | null
}

export interface ImportMatchInput {
  date: string | null
  player1Name: string
  deck1Query: string
  player2Name: string
  deck2Query: string
  winnerName: string
  firstPlayerName: string | null
  notes: string | null
}

export interface ImportSummary {
  importRecord: ImportRecord
  createdMatches: number
}

export interface AppSettings {
  lastBackupReminder: string | null
  backupReminderIntervalDays: number
  language: Language
  onboardingCompleted: boolean
  lastGroupCode: string | null
  deviceLabel: string | null
  lastLoginLinkSentAt: string | null
}

export interface AppState {
  schemaVersion: number
  appVersion: string
  currentSessionId: string | null
  players: Player[]
  playerAliases: PlayerAlias[]
  leaders: Leader[]
  deckVariants: DeckVariant[]
  sessionPlayers: SessionPlayer[]
  sessionDecks: SessionDeck[]
  decks: Deck[]
  sessions: Session[]
  activeMatches: ActiveMatch[]
  matches: Match[]
  matchRevisions: MatchRevision[]
  importBatches: ImportBatch[]
  importRows: ImportRow[]
  importRecords: ImportRecord[]
  settings: AppSettings
}

export type TabId = 'record' | 'stats' | 'history' | 'settings'

export interface RecentCombo {
  player1Id: string
  deck1Id: string
  player2Id: string
  deck2Id: string
  lastUsedAt: string
}
