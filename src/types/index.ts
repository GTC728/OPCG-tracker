export type ResultType = 'normal' | 'draw' | 'forfeit'
export type MatchSource = 'manual' | 'import' | 'manual_edit' | 'restore' | 'historical'
export type MatchTrustTier = 'self' | 'group' | 'verified'
export type GroupMemberRole = 'owner' | 'member' | 'reader'
export type Language = 'zh-Hant' | 'zh-Hans' | 'en' | 'ja'

export type ThemeMode = 'dark' | 'light' | 'system'
export type AccentPreset = 'blue' | 'red' | 'green' | 'purple' | 'gold'
export type UiDensity = 'compact' | 'comfortable'
export type StatsDefaultScope = 'session' | 'all' | 'profile'

export interface Player {
  id: string
  name: string
  aliases: string[]
  archived: boolean
  deletedAt: string | null
  profileClaimDeviceId: string | null
  profileClaimedAt: string | null
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
  archivedAt: string | null
  deletedAt: string | null
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
  tableSlot: number | null
  player1Id: string
  deck1Id: string
  player2Id: string
  deck2Id: string
  firstPlayerId: string | null
  /** Set when all four roster fields are filled — match timer starts here. */
  startedAt: string | null
  notes: string | null
}

export type AuditKind =
  | 'match_complete'
  | 'match_undo'
  | 'match_edit'
  | 'match_delete'
  | 'import'
  | 'import_revert'
  | 'sync'
  | 'session'

export interface AuditEntry {
  id: string
  at: string
  kind: AuditKind
  message: string
}

export interface ActiveMatchInput {
  player1Id: string
  deck1Id: string
  player2Id: string
  deck2Id: string
  firstPlayerId: string | null
  notes: string | null
  tableSlot?: number | null
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
  /** Reserved for verified dual-confirm flow (v4.12+). */
  trustTier?: MatchTrustTier
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
  revertedAt: string | null
  targetSessionId: string | null
  /** True when imported as one-time pre-app historical restore (V4.11.1+). */
  historicalRestore?: boolean
}

export interface ImportSnapshotMeta {
  id: string
  label: string
  createdAt: string
  matchCount: number
  playerCount: number
}

export interface ImportMatchOptions {
  /** Default true in UI — writes into a dedicated import session. */
  createNewSession?: boolean
  sessionName?: string
  skipSnapshot?: boolean
  /** When true, temporarily pauses group push during import (restored after). */
  pauseSyncDuringImport?: boolean
  /** One-time pre-app history — tags matches as source historical (V4.11.1+). */
  historicalRestore?: boolean
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

export interface AchievementUnlock {
  achievementId: string
  /** @deprecated Use profileIdentityId — kept for migration */
  playerId: string
  profileIdentityId: string
  level: number
  unlockedAt: string
  /** Test-group unlocks — discarded when leaving a TEST* group */
  provisional?: boolean
}

export interface ProfileLifetimeStats {
  profileIdentityId: string
  totalMatches: number
  totalWins: number
  longestWinStreak: number
  maxDeckWins: number
  uniqueDeckIds: string[]
  uniqueOpponentNames: string[]
  maxSessionMatches: number
  notesMatches: number
  recentOutcomes: ('w' | 'l')[]
  updatedAt: string
}

export interface GroupProfileBookmark {
  playerId: string
  playerName: string
  linkedAt: string
}

export interface AppSettings {
  lastBackupReminder: string | null
  backupReminderIntervalDays: number
  language: Language
  onboardingCompleted: boolean
  lastGroupCode: string | null
  deviceLabel: string | null
  lastLoginLinkSentAt: string | null
  rosterPromptSessionId: string | null
  sessionTableCounts: Record<string, number>
  groupCollabEnabled: boolean
  groupCollabBootstrapped: boolean
  sessionDayPromptDismissedFor: string | null
  linkedPlayerId: string | null
  profileSetupCompleted: boolean
  /** Stable cross-group profile key for achievements and lifetime stats */
  profileIdentityId: string | null
  theme: ThemeMode
  accent: AccentPreset
  density: UiDensity
  statsDefaultScope: StatsDefaultScope
  achievementNotifications: boolean
  lastGroupSyncAt: string | null
  lastGroupSyncError: string | null
  /** When true, local edits are not pushed to the group until resumed. Pull still applies. */
  groupSyncPaused: boolean
  groupSyncPausedAt: string | null
  /** Which group's data is currently loaded locally; null when not in a group. */
  groupDataBoundCode: string | null
  /** Stable display name for auto-relinking across groups */
  profileDisplayName: string | null
  /** Per-group player UUID bookmarks (personal layer) */
  groupProfileLinks: Record<string, GroupProfileBookmark>
  /** Cached from Supabase group_members.role */
  groupMemberRole: GroupMemberRole | null
  lastCloudBackupAt: string | null
  autoBackupOnLogin: boolean
}

export interface AppState {
  schemaVersion: number
  appVersion: string
  auditLog: AuditEntry[]
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
  achievementUnlocks: AchievementUnlock[]
  profileLifetime: ProfileLifetimeStats | null
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
