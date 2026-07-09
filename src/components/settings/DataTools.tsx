import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { ImportHistoryPanel } from '@/components/settings/ImportHistoryPanel'
import { isDeletedPlayer, isDeletedSession } from '@/lib/entityVisibility'
import { exportAppStateExcel } from '@/lib/excelExport'
import {
  detectTestImportWarning,
  needsTypedConfirm,
  summarizeImportRows,
} from '@/lib/importSafety'
import { useI18n } from '@/lib/i18n'
import { importAppStateJson } from '@/lib/storage'
import { getCompletedMatches } from '@/lib/stats'
import { prepareRestoredAppState } from '@/lib/restoreState'
import { getAppState, useAppStore } from '@/stores/appStore'
import type { AppState, ImportMatchInput } from '@/types'

type TableRows = string[][]

type ReadFileResult =
  | { kind: 'tabular'; rows: TableRows; raw: string }
  | { kind: 'opcg-export'; state: AppState; raw: string }

interface Mapping {
  date: string
  player1Name: string
  deck1Query: string
  player2Name: string
  deck2Query: string
  winnerName: string
  firstPlayerName: string
  notes: string
}

const emptyMapping: Mapping = {
  date: '',
  player1Name: '',
  deck1Query: '',
  player2Name: '',
  deck2Query: '',
  winnerName: '',
  firstPlayerName: '',
  notes: '',
}

function parseCsv(text: string): TableRows {
  const rows: TableRows = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(cell.trim())
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

function stringifyCell(cell: unknown): string {
  return String(cell ?? '')
}

function rowsToTableRows(rows: unknown[][]): TableRows {
  return rows.filter((row) => row.some(Boolean)).map((row) => row.map(stringifyCell))
}

async function tryReadOpcgExport(file: File): Promise<ReadFileResult | null> {
  const { readSheet } = await import('read-excel-file/browser')
  let metaRows: unknown[][]

  try {
    metaRows = (await readSheet(file, '_meta')) as unknown[][]
  } catch {
    return null
  }

  const meta = new Map(
    metaRows
      .slice(1)
      .map((row) => [stringifyCell(row[0]), stringifyCell(row[1])] as const)
      .filter(([key]) => key),
  )
  if (meta.get('export_format') !== 'opcg-tracker-excel') return null

  const snapshotRows = (await readSheet(file, '_app_state_json')) as unknown[][]
  const snapshot = snapshotRows
    .slice(1)
    .map((row) => stringifyCell(row[1]))
    .join('')

  if (!snapshot) {
    throw new Error('這個 OPCG Excel 缺少完整資料備份')
  }

  return {
    kind: 'opcg-export',
    state: importAppStateJson(snapshot),
    raw: snapshot,
  }
}

async function readFileAsRows(file: File): Promise<ReadFileResult> {
  const buffer = await file.arrayBuffer()

  if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
    const opcgExport = await tryReadOpcgExport(file)
    if (opcgExport) return opcgExport

    const { readSheet } = await import('read-excel-file/browser')
    const rows = (await readSheet(file)) as unknown as unknown[][]
    return {
      kind: 'tabular',
      rows: rowsToTableRows(rows),
      raw: JSON.stringify(rows),
    }
  }

  const raw = new TextDecoder('utf-8').decode(buffer)
  return { kind: 'tabular', rows: parseCsv(raw), raw }
}

function guessMapping(headers: string[]): Mapping {
  const findHeader = (patterns: string[]) => {
    const index = headers.findIndex((header) => {
      const normalized = header.toLowerCase().replace(/\s/g, '')
      return patterns.some((pattern) => normalized.includes(pattern))
    })
    return index >= 0 ? String(index) : ''
  }

  return {
    date: findHeader(['date', '日期', '時間']),
    player1Name: findHeader(['playera', 'player1', '玩家a', '玩家1']),
    deck1Query: findHeader(['decka', 'deck1', '牌組a', '卡組a', '牌組1']),
    player2Name: findHeader(['playerb', 'player2', '玩家b', '玩家2']),
    deck2Query: findHeader(['deckb', 'deck2', '牌組b', '卡組b', '牌組2']),
    winnerName: findHeader(['winner', '勝方', '勝者']),
    firstPlayerName: findHeader(['first', '先攻']),
    notes: findHeader(['note', '備註']),
  }
}

function getCell(row: string[], index: string): string {
  if (!index) return ''
  return row[Number(index)] ?? ''
}

function MappingSelect({
  label,
  value,
  headers,
  required = false,
  onChange,
}: {
  label: string
  value: string
  headers: string[]
  required?: boolean
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-sm text-text-secondary">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      <select
        className="mt-2 min-h-11 w-full rounded-xl border border-surface-muted bg-surface px-3 text-text-primary"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">不匯入</option>
        {headers.map((header, index) => (
          <option key={`${header}-${index}`} value={index}>
            {header || `欄位 ${index + 1}`}
          </option>
        ))}
      </select>
    </label>
  )
}

function ImportTool() {
  const { t } = useI18n()
  const importMatches = useAppStore((state) => state.importMatches)
  const replaceState = useAppStore((state) => state.replaceState)
  const toast = useToast()
  const [filename, setFilename] = useState('')
  const [raw, setRaw] = useState('')
  const [rows, setRows] = useState<TableRows>([])
  const [pendingRestore, setPendingRestore] = useState<AppState | null>(null)
  const [reading, setReading] = useState(false)
  const headers = rows[0] ?? []
  const bodyRows = useMemo(() => rows.slice(1), [rows])
  const [mapping, setMapping] = useState<Mapping>(emptyMapping)
  const [message, setMessage] = useState<string | null>(null)
  const [createNewSession, setCreateNewSession] = useState(true)
  const [confirmText, setConfirmText] = useState('')
  const inGroup = useAppStore((state) => Boolean(state.settings.lastGroupCode))
  const groupSyncPaused = useAppStore((state) => state.settings.groupSyncPaused)

  const mappedRows = useMemo<ImportMatchInput[]>(() => {
    return bodyRows.map((row) => ({
      date: getCell(row, mapping.date) || null,
      player1Name: getCell(row, mapping.player1Name),
      deck1Query: getCell(row, mapping.deck1Query),
      player2Name: getCell(row, mapping.player2Name),
      deck2Query: getCell(row, mapping.deck2Query),
      winnerName: getCell(row, mapping.winnerName),
      firstPlayerName: getCell(row, mapping.firstPlayerName) || null,
      notes: getCell(row, mapping.notes) || null,
    }))
  }, [bodyRows, mapping])

  const importSummary = useMemo(
    () => (mappedRows.length ? summarizeImportRows(mappedRows) : null),
    [mappedRows],
  )
  const importWarning = useMemo(
    () => (mappedRows.length ? detectTestImportWarning(filename, mappedRows) : null),
    [mappedRows, filename],
  )
  const typedConfirmRequired = mappedRows.length ? needsTypedConfirm(mappedRows.length) : false
  const typedConfirmOk =
    !typedConfirmRequired || confirmText.trim() === t('data.importConfirmPlaceholder')

  const canImport =
    mappedRows.length > 0 &&
    mapping.player1Name &&
    mapping.deck1Query &&
    mapping.player2Name &&
    mapping.deck2Query &&
    mapping.winnerName &&
    typedConfirmOk

  return (
    <section className="rounded-2xl bg-surface-elevated p-4">
      <h2 className="text-lg font-semibold">{t('data.importTitle')}</h2>
      <p className="mt-1 text-sm text-text-secondary">
        {t('data.importDesc')}
      </p>
      <label className="mt-4 block cursor-pointer rounded-2xl border-2 border-dashed border-brand-500/60 bg-brand-500/10 p-4 text-center transition hover:border-brand-500 hover:bg-brand-500/15 active:scale-[0.99]">
        <span className="block text-base font-semibold text-brand-100">
          {reading ? t('data.reading') : t('data.chooseFile')}
        </span>
        <span className="mt-1 block text-xs text-text-secondary">
          {filename || t('data.supportedFiles')}
        </span>
        <input
          className="sr-only"
          type="file"
          accept=".csv,.xlsx,.xls"
          disabled={reading}
          onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            setReading(true)
            try {
              const result = await readFileAsRows(file)
              setFilename(file.name)
              setRaw(result.raw)
              if (result.kind === 'opcg-export') {
                setRows([])
                setPendingRestore(result.state)
                const nextMessage = `偵測到 OPCG Tracker 匯出檔：${result.state.matches.length} 場對局，${result.state.players.length} 位玩家`
                setMessage(nextMessage)
                toast.info(nextMessage)
                return
              }

              setPendingRestore(null)
              setRows(result.rows)
              setMapping(guessMapping(result.rows[0] ?? []))
              const nextMessage = `已讀取 ${result.rows.length - 1} 行資料`
              setMessage(nextMessage)
              toast.success(nextMessage)
            } catch (caught) {
              const nextMessage = caught instanceof Error ? caught.message : '讀取檔案失敗'
              setMessage(nextMessage)
              toast.error(nextMessage)
            } finally {
              setReading(false)
              event.currentTarget.value = ''
            }
          }}
        />
      </label>

      {pendingRestore ? (
        <div className="mt-4 rounded-2xl bg-surface p-3">
          <p className="font-semibold text-text-primary">{t('data.restoreExport')}</p>
          <p className="mt-1 text-sm text-text-secondary">
            {t('data.restoreExportDesc')}
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-text-secondary">
            <div className="rounded-xl bg-surface-elevated p-2">
              <dt>對局</dt>
              <dd className="mt-1 text-base font-semibold text-text-primary">{pendingRestore.matches.length}</dd>
            </div>
            <div className="rounded-xl bg-surface-elevated p-2">
              <dt>玩家</dt>
              <dd className="mt-1 text-base font-semibold text-text-primary">{pendingRestore.players.length}</dd>
            </div>
            <div className="rounded-xl bg-surface-elevated p-2">
              <dt>牌組</dt>
              <dd className="mt-1 text-base font-semibold text-text-primary">{pendingRestore.deckVariants.length}</dd>
            </div>
          </dl>
          <Button
            className="mt-3"
            fullWidth
            variant="danger"
            onClick={() => {
              replaceState(prepareRestoredAppState(pendingRestore))
              setPendingRestore(null)
              const nextMessage = '已還原 OPCG Tracker Excel 資料'
              setMessage(nextMessage)
              toast.success(nextMessage)
            }}
          >
            {t('data.confirmRestore')}
          </Button>
        </div>
      ) : null}

      {headers.length ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MappingSelect label="日期" value={mapping.date} headers={headers} onChange={(date) => setMapping((current) => ({ ...current, date }))} />
            <MappingSelect label="玩家 A" required value={mapping.player1Name} headers={headers} onChange={(player1Name) => setMapping((current) => ({ ...current, player1Name }))} />
            <MappingSelect label="牌組 A" required value={mapping.deck1Query} headers={headers} onChange={(deck1Query) => setMapping((current) => ({ ...current, deck1Query }))} />
            <MappingSelect label="玩家 B" required value={mapping.player2Name} headers={headers} onChange={(player2Name) => setMapping((current) => ({ ...current, player2Name }))} />
            <MappingSelect label="牌組 B" required value={mapping.deck2Query} headers={headers} onChange={(deck2Query) => setMapping((current) => ({ ...current, deck2Query }))} />
            <MappingSelect label="勝方" required value={mapping.winnerName} headers={headers} onChange={(winnerName) => setMapping((current) => ({ ...current, winnerName }))} />
            <MappingSelect label="先攻" value={mapping.firstPlayerName} headers={headers} onChange={(firstPlayerName) => setMapping((current) => ({ ...current, firstPlayerName }))} />
            <MappingSelect label="備註" value={mapping.notes} headers={headers} onChange={(notes) => setMapping((current) => ({ ...current, notes }))} />
          </div>

          <div className="mt-4 rounded-2xl bg-surface p-3 text-xs text-text-secondary">
            <p className="font-semibold text-text-primary">{t('data.importImpactTitle')}</p>
            {importSummary ? (
              <p className="mt-2">
                {importSummary.rowCount} 場 · {importSummary.uniquePlayers.length} 位玩家
                {importSummary.dateMin ? ` · ${importSummary.dateMin} ~ ${importSummary.dateMax}` : ''}
              </p>
            ) : null}
            {importWarning ? (
              <p className="mt-2 rounded-lg bg-amber-500/15 p-2 text-amber-100">{importWarning}</p>
            ) : null}
            {inGroup ? (
              <p className="mt-2 text-text-secondary">
                {t('data.importGroupNote')}
                {groupSyncPaused ? '（目前推送已暫停）' : ''}
              </p>
            ) : null}
            <label className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={createNewSession}
                onChange={(event) => setCreateNewSession(event.target.checked)}
              />
              <span>{t('data.importTargetNew')}</span>
            </label>
            {!createNewSession ? (
              <p className="mt-1 text-amber-200">{t('data.importTargetCurrent')}</p>
            ) : null}
          </div>

          <div className="mt-4 rounded-2xl bg-surface p-3 text-xs text-text-secondary">
            <p className="font-semibold text-text-primary">{t('data.preview')}</p>
            {mappedRows.slice(0, 3).map((row, index) => (
              <p key={index} className="mt-2">
                {row.player1Name} ({row.deck1Query}) vs {row.player2Name} ({row.deck2Query}) · 勝：
                {row.winnerName}
              </p>
            ))}
          </div>

          {typedConfirmRequired ? (
            <label className="mt-4 block">
              <span className="text-sm text-text-secondary">{t('data.importConfirmType')}</span>
              <input
                className="mt-2 min-h-11 w-full rounded-xl border border-surface-muted bg-surface px-3 text-text-primary"
                value={confirmText}
                placeholder={t('data.importConfirmPlaceholder')}
                onChange={(event) => setConfirmText(event.target.value)}
              />
            </label>
          ) : null}

          <Button
            className="mt-4"
            fullWidth
            disabled={!canImport}
            onClick={() => {
              const result = importMatches(mappedRows, filename || 'import.csv', raw, {
                createNewSession,
              })
              setConfirmText('')
              const nextMessage = `匯入完成：成功 ${result.importRecord.successCount}，錯誤 ${result.importRecord.errorCount}`
              setMessage(nextMessage)
              toast.success(nextMessage)
            }}
          >
            {t('data.confirmImport')}
          </Button>
        </>
      ) : null}
      {message ? <p className="mt-3 text-sm text-text-secondary">{message}</p> : null}
    </section>
  )
}

function ExportTool() {
  const { t } = useI18n()
  const toast = useToast()
  const allMatches = useAppStore((state) => state.matches)
  const allPlayers = useAppStore((state) => state.players)
  const allSessions = useAppStore((state) => state.sessions)
  const matches = getCompletedMatches(allMatches).length
  const players = allPlayers.filter((player) => !isDeletedPlayer(player)).length
  const leaders = useAppStore((state) => state.leaders.length)
  const deckVariants = useAppStore((state) => state.deckVariants.length)
  const sessions = allSessions.filter((session) => !isDeletedSession(session)).length
  const deletedMatches = allMatches.length - matches
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  return (
    <section className="rounded-2xl bg-surface-elevated p-4">
      <h2 className="text-lg font-semibold">{t('data.exportTitle')}</h2>
      <p className="mt-1 text-sm text-text-secondary">
        {t('data.exportDesc')}
      </p>
      <dl className="mt-4 grid grid-cols-5 gap-2 text-center text-xs text-text-secondary">
        <div className="rounded-xl bg-surface p-2">
          <dt>對局</dt>
          <dd className="mt-1 text-base font-semibold text-text-primary">{matches}</dd>
        </div>
        <div className="rounded-xl bg-surface p-2">
          <dt>玩家</dt>
          <dd className="mt-1 text-base font-semibold text-text-primary">{players}</dd>
        </div>
        <div className="rounded-xl bg-surface p-2">
          <dt>Leader</dt>
          <dd className="mt-1 text-base font-semibold text-text-primary">{leaders}</dd>
        </div>
        <div className="rounded-xl bg-surface p-2">
          <dt>牌組</dt>
          <dd className="mt-1 text-base font-semibold text-text-primary">{deckVariants}</dd>
        </div>
        <div className="rounded-xl bg-surface p-2">
          <dt>Session</dt>
          <dd className="mt-1 text-base font-semibold text-text-primary">{sessions}</dd>
        </div>
      </dl>
      {deletedMatches > 0 ? (
        <p className="mt-2 text-xs text-text-secondary">
          另有 {deletedMatches} 場已刪除對局（含撤銷匯入）僅保留在完整備份表，不列入上方統計與「對局總表」。
        </p>
      ) : null}
      <Button
        className="mt-4"
        fullWidth
        disabled={busy}
        loading={busy}
        loadingLabel={t('data.exporting')}
        onClick={async () => {
          setBusy(true)
          setMessage(null)
          try {
            await exportAppStateExcel(getAppState())
            setMessage(t('data.exportSuccess'))
            toast.success(t('data.exportSuccess'))
          } catch (caught) {
            const nextMessage = caught instanceof Error ? caught.message : 'Excel 匯出失敗'
            setMessage(nextMessage)
            toast.error(nextMessage)
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? t('data.exporting') : t('data.exportButton')}
      </Button>
      {message ? <p className="mt-3 text-sm text-text-secondary">{message}</p> : null}
    </section>
  )
}

export function DataTools() {
  return (
    <>
      <ExportTool />
      <ImportTool />
      <ImportHistoryPanel />
    </>
  )
}
