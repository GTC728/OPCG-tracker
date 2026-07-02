import { APP_VERSION } from '@/lib/constants'
import { getDeckDisplayName, getLeader, getPlayerAliases } from '@/lib/selectors'
import type { AppState, DeckVariant, Leader, Match, Player } from '@/types'
import type { Row, Sheet } from 'write-excel-file/browser'

const EXPORT_FORMAT = 'opcg-tracker-excel'
const EXPORT_FORMAT_VERSION = 1
const JSON_CHUNK_SIZE = 30000

type Primitive = string | number | boolean | null | undefined
type SheetRow = Record<string, Primitive>

interface ColumnDefinition {
  sheetName: string
  columnName: string
  required: boolean
  type: string
  description: string
  allowedValues?: string
}

interface ExportOptions {
  deviceLabel?: string
  fileName?: string
}

function text(value: Primitive): string | number | boolean | null {
  if (value === null || value === undefined) return null
  return value
}

function joinList(values: string[]): string {
  return values.filter(Boolean).join('|')
}

function localDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-CA')
}

function json(value: unknown): string {
  return JSON.stringify(value)
}

function headerRow(columns: string[]): Row {
  return columns.map((column) => ({
    value: column,
    fontWeight: 'bold',
    backgroundColor: '#E8EEF7',
  }))
}

function titleRow(title: string, width: number): Row {
  return [
    {
      value: title,
      fontWeight: 'bold',
      fontSize: 16,
      backgroundColor: '#1F4E78',
      textColor: '#FFFFFF',
    },
    ...Array.from({ length: Math.max(0, width - 1) }, () => null),
  ]
}

function rowsFromObjects(columns: string[], rows: SheetRow[]): Row[] {
  return [headerRow(columns), ...rows.map((row) => columns.map((column) => text(row[column])))]
}

function sheet(sheetName: string, columns: string[], rows: SheetRow[], stickyRowsCount = 1): Sheet<Blob> {
  return {
    sheet: sheetName,
    data: rowsFromObjects(columns, rows),
    columns: columns.map((column) => ({ width: Math.max(14, Math.min(column.length + 4, 32)) })),
    stickyRowsCount,
  }
}

function readableSheet(sheetName: string, columns: string[], rows: SheetRow[]): Sheet<Blob> {
  return {
    sheet: sheetName,
    data: rowsFromObjects(columns, rows),
    columns: columns.map((column) => ({ width: Math.max(12, Math.min(column.length * 2 + 4, 36)) })),
    stickyRowsCount: 1,
  }
}

function readmeSheet(state: AppState, exportedAt: string): Sheet<Blob> {
  const rows: Row[] = [
    titleRow('OPCG Tracker Excel Export', 2),
    [null, null],
    ['先看哪裡', '請先看「對局總表」。這是給人閱讀、篩選、分享的主要表。'],
    ['要還原資料', '在 app 的匯入功能選擇此檔案，系統會辨認 _app_state_json 並要求你確認還原。'],
    ['資料庫表', '底線開頭或英文表名是給程式匯入、兼容、審計用，不需要平常閱讀。'],
    [null, null],
    ['匯出時間', exportedAt],
    ['App 版本', state.appVersion || APP_VERSION],
    ['Schema 版本', state.schemaVersion],
    ['完成對局', state.matches.length],
    ['玩家', state.players.length],
    ['Leader', state.leaders.length],
    ['Deck Variants', state.deckVariants.length],
    ['Sessions', state.sessions.length],
  ]

  return {
    sheet: 'README',
    data: rows,
    columns: [{ width: 22 }, { width: 76 }],
  }
}

function getPlayerName(playersById: Map<string, Player>, playerId: string | null | undefined): string | null {
  if (!playerId) return null
  return playersById.get(playerId)?.name ?? null
}

function getVariantLeader(
  variantsById: Map<string, DeckVariant>,
  leadersById: Map<string, Leader>,
  variantId: string | null | undefined,
): { variant: DeckVariant | null; leader: Leader | null } {
  if (!variantId) return { variant: null, leader: null }
  const variant = variantsById.get(variantId) ?? null
  const leader = variant ? leadersById.get(variant.leaderId) ?? null : null
  return { variant, leader }
}

function matchSide(match: Match, playerId: string | null): 'player1' | 'player2' | null {
  if (!playerId) return null
  if (match.player1Id === playerId) return 'player1'
  if (match.player2Id === playerId) return 'player2'
  return null
}

function buildMatchRows(state: AppState): SheetRow[] {
  const sessionsById = new Map(state.sessions.map((session) => [session.id, session]))
  const playersById = new Map(state.players.map((player) => [player.id, player]))
  const leadersById = new Map(state.leaders.map((leader) => [leader.id, leader]))
  const variantsById = new Map(state.deckVariants.map((variant) => [variant.id, variant]))

  return state.matches.map((match) => {
    const session = sessionsById.get(match.sessionId)
    const deck1 = getVariantLeader(variantsById, leadersById, match.deck1Id)
    const deck2 = getVariantLeader(variantsById, leadersById, match.deck2Id)

    return {
      match_id: match.id,
      session_id: match.sessionId,
      session_name: session?.name,
      match_number: match.matchNumber,
      started_at: match.startedAt,
      finished_at: match.finishedAt,
      local_date: localDate(match.finishedAt),
      player1_id: match.player1Id,
      player1_name: getPlayerName(playersById, match.player1Id),
      deck1_variant_id: match.deck1Id,
      deck1_name: getDeckDisplayName(state, match.deck1Id),
      deck1_leader_code: deck1.leader?.code,
      deck1_leader_name: deck1.leader?.name,
      deck1_colors: joinList(deck1.leader?.colors ?? []),
      player2_id: match.player2Id,
      player2_name: getPlayerName(playersById, match.player2Id),
      deck2_variant_id: match.deck2Id,
      deck2_name: getDeckDisplayName(state, match.deck2Id),
      deck2_leader_code: deck2.leader?.code,
      deck2_leader_name: deck2.leader?.name,
      deck2_colors: joinList(deck2.leader?.colors ?? []),
      winner_side: matchSide(match, match.winnerPlayerId),
      winner_player_id: match.winnerPlayerId,
      winner_player_name: getPlayerName(playersById, match.winnerPlayerId),
      winner_deck_variant_id: match.winnerDeckId,
      first_player_side: matchSide(match, match.firstPlayerId),
      first_player_id: match.firstPlayerId,
      first_player_name: getPlayerName(playersById, match.firstPlayerId),
      result_type: match.resultType,
      source: match.source,
      deleted_at: match.deletedAt,
      notes: match.notes,
    }
  })
}

function buildReadableMatchRows(state: AppState): SheetRow[] {
  const sessionsById = new Map(state.sessions.map((session) => [session.id, session]))
  const playersById = new Map(state.players.map((player) => [player.id, player]))

  return [...state.matches]
    .sort((left, right) => right.finishedAt.localeCompare(left.finishedAt))
    .map((match) => {
      const player1Name = getPlayerName(playersById, match.player1Id) ?? '未知玩家'
      const player2Name = getPlayerName(playersById, match.player2Id) ?? '未知玩家'
      const winnerName = getPlayerName(playersById, match.winnerPlayerId) ?? '未知玩家'
      const firstPlayerName = getPlayerName(playersById, match.firstPlayerId)

      return {
        日期: localDate(match.finishedAt),
        Session: sessionsById.get(match.sessionId)?.name,
        場次: match.matchNumber,
        對局: `${player1Name} vs ${player2Name}`,
        玩家A: player1Name,
        牌組A: getDeckDisplayName(state, match.deck1Id),
        玩家B: player2Name,
        牌組B: getDeckDisplayName(state, match.deck2Id),
        勝方: winnerName,
        先攻: firstPlayerName,
        結果: match.resultType,
        狀態: match.deletedAt ? '已刪除' : '正常',
        來源: match.source,
        備註: match.notes,
      }
    })
}

function buildActiveMatchRows(state: AppState): SheetRow[] {
  const sessionsById = new Map(state.sessions.map((session) => [session.id, session]))
  const playersById = new Map(state.players.map((player) => [player.id, player]))

  return state.activeMatches.map((match) => ({
    active_match_id: match.id,
    session_id: match.sessionId,
    session_name: sessionsById.get(match.sessionId)?.name,
    match_number: match.matchNumber,
    started_at: match.startedAt,
    local_date: localDate(match.startedAt),
    player1_id: match.player1Id,
    player1_name: getPlayerName(playersById, match.player1Id),
    deck1_variant_id: match.deck1Id,
    deck1_name: getDeckDisplayName(state, match.deck1Id),
    player2_id: match.player2Id,
    player2_name: getPlayerName(playersById, match.player2Id),
    deck2_variant_id: match.deck2Id,
    deck2_name: getDeckDisplayName(state, match.deck2Id),
    first_player_side:
      match.firstPlayerId === match.player1Id ? 'player1' : match.firstPlayerId === match.player2Id ? 'player2' : null,
    first_player_id: match.firstPlayerId,
    first_player_name: getPlayerName(playersById, match.firstPlayerId),
    notes: match.notes,
  }))
}

function buildDictionary(definitions: ColumnDefinition[]): SheetRow[] {
  return definitions.map((definition) => ({
    sheet_name: definition.sheetName,
    column_name: definition.columnName,
    required: definition.required,
    type: definition.type,
    description: definition.description,
    allowed_values: definition.allowedValues,
    introduced_in_export_version: EXPORT_FORMAT_VERSION,
  }))
}

function defineColumns(
  sheetName: string,
  columns: string[],
  requiredColumns: string[],
  typeByColumn: Record<string, string> = {},
  enumByColumn: Record<string, string> = {},
): ColumnDefinition[] {
  const required = new Set(requiredColumns)
  return columns.map((column) => ({
    sheetName,
    columnName: column,
    required: required.has(column),
    type: typeByColumn[column] ?? 'text',
    description: `${sheetName}.${column}`,
    allowedValues: enumByColumn[column],
  }))
}

function buildJsonSnapshotRows(state: AppState): SheetRow[] {
  const serialized = JSON.stringify(state)
  const chunks = serialized.match(new RegExp(`.{1,${JSON_CHUNK_SIZE}}`, 'g')) ?? ['']

  return chunks.map((chunk, index) => ({
    key: index === 0 ? 'app_state_json' : `app_state_json_part_${String(index + 1).padStart(4, '0')}`,
    value: chunk,
  }))
}

export function buildExportSheets(state: AppState, options: ExportOptions = {}): Sheet<Blob>[] {
  const playersById = new Map(state.players.map((player) => [player.id, player]))
  const exportedAt = new Date().toISOString()

  const readableMatchColumns = [
    '日期',
    'Session',
    '場次',
    '對局',
    '玩家A',
    '牌組A',
    '玩家B',
    '牌組B',
    '勝方',
    '先攻',
    '結果',
    '狀態',
    '來源',
    '備註',
  ]
  const metaColumns = ['key', 'value']
  const matchColumns = [
    'match_id',
    'session_id',
    'session_name',
    'match_number',
    'started_at',
    'finished_at',
    'local_date',
    'player1_id',
    'player1_name',
    'deck1_variant_id',
    'deck1_name',
    'deck1_leader_code',
    'deck1_leader_name',
    'deck1_colors',
    'player2_id',
    'player2_name',
    'deck2_variant_id',
    'deck2_name',
    'deck2_leader_code',
    'deck2_leader_name',
    'deck2_colors',
    'winner_side',
    'winner_player_id',
    'winner_player_name',
    'winner_deck_variant_id',
    'first_player_side',
    'first_player_id',
    'first_player_name',
    'result_type',
    'source',
    'deleted_at',
    'notes',
  ]
  const playerColumns = ['player_id', 'name', 'aliases', 'archived', 'created_at', 'updated_at']
  const aliasColumns = ['alias_id', 'player_id', 'player_name', 'alias', 'source']
  const leaderColumns = [
    'leader_id',
    'leader_code',
    'set_code',
    'leader_name',
    'colors',
    'traits',
    'source',
    'updated_at',
  ]
  const variantColumns = [
    'deck_variant_id',
    'leader_id',
    'leader_code',
    'leader_name',
    'variant_name',
    'owner_player_id',
    'owner_player_name',
    'aliases',
    'archived',
    'created_at',
    'updated_at',
  ]
  const sessionColumns = ['session_id', 'name', 'started_at', 'ended_at', 'created_at']
  const activeMatchColumns = [
    'active_match_id',
    'session_id',
    'session_name',
    'match_number',
    'started_at',
    'local_date',
    'player1_id',
    'player1_name',
    'deck1_variant_id',
    'deck1_name',
    'player2_id',
    'player2_name',
    'deck2_variant_id',
    'deck2_name',
    'first_player_side',
    'first_player_id',
    'first_player_name',
    'notes',
  ]
  const revisionColumns = ['revision_id', 'match_id', 'edited_at', 'reason', 'before_json', 'after_json']
  const importBatchColumns = [
    'batch_id',
    'filename',
    'imported_at',
    'schema_version',
    'total_rows',
    'success_count',
    'error_count',
    'raw_file_hash',
  ]
  const importRowColumns = [
    'row_id',
    'batch_id',
    'row_number',
    'status',
    'error_message',
    'match_id',
    'raw_json',
  ]
  const dictionaryColumns = [
    'sheet_name',
    'column_name',
    'required',
    'type',
    'description',
    'allowed_values',
    'introduced_in_export_version',
  ]
  const snapshotColumns = ['key', 'value']

  const definitions = [
    ...defineColumns('_meta', metaColumns, ['key', 'value']),
    ...defineColumns('matches', matchColumns, ['match_id'], {
      match_number: 'number',
    }, {
      winner_side: 'player1|player2',
      first_player_side: 'player1|player2|blank',
      result_type: 'normal|draw|forfeit',
      source: 'manual|import|manual_edit',
    }),
    ...defineColumns('players', playerColumns, ['player_id', 'name']),
    ...defineColumns('player_aliases', aliasColumns, ['alias_id', 'player_id', 'alias'], {}, {
      source: 'manual|import|merge',
    }),
    ...defineColumns('leaders', leaderColumns, ['leader_id', 'leader_code']),
    ...defineColumns('deck_variants', variantColumns, ['deck_variant_id', 'leader_id']),
    ...defineColumns('sessions', sessionColumns, ['session_id', 'name']),
    ...defineColumns('active_matches', activeMatchColumns, ['active_match_id'], {}, {
      first_player_side: 'player1|player2|blank',
    }),
    ...defineColumns('match_revisions', revisionColumns, ['revision_id', 'match_id']),
    ...defineColumns('import_batches', importBatchColumns, ['batch_id']),
    ...defineColumns('import_rows', importRowColumns, ['row_id', 'batch_id']),
    ...defineColumns('_dictionary', dictionaryColumns, ['sheet_name', 'column_name']),
    ...defineColumns('_app_state_json', snapshotColumns, ['key', 'value']),
  ]

  const rowCounts = {
    matches: state.matches.length,
    players: state.players.length,
    player_aliases: state.playerAliases.length,
    leaders: state.leaders.length,
    deck_variants: state.deckVariants.length,
    sessions: state.sessions.length,
    active_matches: state.activeMatches.length,
    match_revisions: state.matchRevisions.length,
    import_batches: state.importBatches.length,
    import_rows: state.importRows.length,
  }

  return [
    readmeSheet(state, exportedAt),
    readableSheet('對局總表', readableMatchColumns, buildReadableMatchRows(state)),
    sheet('_meta', metaColumns, [
      { key: 'export_format', value: EXPORT_FORMAT },
      { key: 'export_format_version', value: EXPORT_FORMAT_VERSION },
      { key: 'app_schema_version', value: state.schemaVersion },
      { key: 'app_version', value: state.appVersion || APP_VERSION },
      { key: 'exported_at', value: exportedAt },
      { key: 'exported_by_device', value: options.deviceLabel ?? '' },
      { key: 'timezone', value: Intl.DateTimeFormat().resolvedOptions().timeZone },
      { key: 'row_counts', value: json(rowCounts) },
    ]),
    sheet('matches', matchColumns, buildMatchRows(state)),
    sheet(
      'players',
      playerColumns,
      state.players.map((player) => ({
        player_id: player.id,
        name: player.name,
        aliases: joinList(getPlayerAliases(state, player.id)),
        archived: player.archived,
        created_at: player.createdAt,
        updated_at: player.updatedAt,
      })),
    ),
    sheet(
      'player_aliases',
      aliasColumns,
      state.playerAliases.map((alias) => ({
        alias_id: alias.id,
        player_id: alias.playerId,
        player_name: playersById.get(alias.playerId)?.name,
        alias: alias.alias,
        source: alias.source,
      })),
    ),
    sheet(
      'leaders',
      leaderColumns,
      state.leaders.map((leader) => ({
        leader_id: leader.id,
        leader_code: leader.code,
        set_code: leader.setCode,
        leader_name: leader.name,
        colors: joinList(leader.colors),
        traits: joinList(leader.traits),
        source: leader.source,
        updated_at: leader.updatedAt,
      })),
    ),
    sheet(
      'deck_variants',
      variantColumns,
      state.deckVariants.map((variant) => {
        const leader = getLeader(state, variant.leaderId)
        return {
          deck_variant_id: variant.id,
          leader_id: variant.leaderId,
          leader_code: leader?.code,
          leader_name: leader?.name,
          variant_name: variant.name,
          owner_player_id: variant.ownerPlayerId,
          owner_player_name: getPlayerName(playersById, variant.ownerPlayerId),
          aliases: joinList(variant.aliases),
          archived: variant.archived,
          created_at: variant.createdAt,
          updated_at: variant.updatedAt,
        }
      }),
    ),
    sheet(
      'sessions',
      sessionColumns,
      state.sessions.map((session) => ({
        session_id: session.id,
        name: session.name,
        started_at: session.startedAt,
        ended_at: session.endedAt,
        created_at: session.createdAt,
      })),
    ),
    sheet('active_matches', activeMatchColumns, buildActiveMatchRows(state)),
    sheet(
      'match_revisions',
      revisionColumns,
      state.matchRevisions.map((revision) => ({
        revision_id: revision.id,
        match_id: revision.matchId,
        edited_at: revision.editedAt,
        reason: revision.reason,
        before_json: json(revision.before),
        after_json: json(revision.after),
      })),
    ),
    sheet(
      'import_batches',
      importBatchColumns,
      state.importBatches.map((batch) => ({
        batch_id: batch.id,
        filename: batch.filename,
        imported_at: batch.importedAt,
        schema_version: batch.schemaVersion,
        total_rows: batch.totalRows,
        success_count: batch.successCount,
        error_count: batch.errorCount,
        raw_file_hash: batch.rawFileHash,
      })),
    ),
    sheet(
      'import_rows',
      importRowColumns,
      state.importRows.map((row) => ({
        row_id: row.id,
        batch_id: row.batchId,
        row_number: row.rowNumber,
        status: row.status,
        error_message: row.errorMessage,
        match_id: row.matchId,
        raw_json: json(row.raw),
      })),
    ),
    sheet('_dictionary', dictionaryColumns, buildDictionary(definitions)),
    sheet('_app_state_json', snapshotColumns, buildJsonSnapshotRows(state)),
  ]
}

export async function exportAppStateExcel(state: AppState, options: ExportOptions = {}): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const exportedDate = new Date().toISOString().slice(0, 10)
  const fileName = options.fileName ?? `opcg-tracker-export-${exportedDate}.xlsx`
  await writeXlsxFile(buildExportSheets(state, options)).toFile(fileName)
}
