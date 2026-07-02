import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/stores/appStore'
import type { ImportMatchInput } from '@/types'

type TableRows = string[][]

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

async function readFileAsRows(file: File): Promise<{ rows: TableRows; raw: string }> {
  const buffer = await file.arrayBuffer()

  if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
    const { default: readXlsxFile } = await import('read-excel-file/browser')
    const rows = (await readXlsxFile(file)) as unknown as unknown[][]
    return {
      rows: rows.filter((row) => row.some(Boolean)).map((row) => row.map((cell) => String(cell ?? ''))),
      raw: JSON.stringify(rows),
    }
  }

  const raw = new TextDecoder('utf-8').decode(buffer)
  return { rows: parseCsv(raw), raw }
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

function PlayerMergeTool() {
  const players = useAppStore((state) => state.players)
  const mergePlayers = useAppStore((state) => state.mergePlayers)
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  return (
    <section className="rounded-2xl bg-surface-elevated p-4">
      <h2 className="text-lg font-semibold">玩家合併</h2>
      <p className="mt-1 text-sm text-text-secondary">
        用來修正 King仔 / B KING仔 這類命名混亂；合併後歷史對局會指向保留玩家。
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label>
          <span className="text-sm text-text-secondary">要合併走</span>
          <select
            className="mt-2 min-h-11 w-full rounded-xl border border-surface-muted bg-surface px-3 text-text-primary"
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
          >
            <option value="">選玩家</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm text-text-secondary">保留為</span>
          <select
            className="mt-2 min-h-11 w-full rounded-xl border border-surface-muted bg-surface px-3 text-text-primary"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
          >
            <option value="">選玩家</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Button
        className="mt-3"
        fullWidth
        disabled={!sourceId || !targetId || sourceId === targetId}
        onClick={() => {
          try {
            mergePlayers(sourceId, targetId)
            setMessage('玩家已合併')
            setSourceId('')
            setTargetId('')
          } catch (caught) {
            setMessage(caught instanceof Error ? caught.message : '合併失敗')
          }
        }}
      >
        合併玩家
      </Button>
      {message ? <p className="mt-3 text-sm text-text-secondary">{message}</p> : null}
    </section>
  )
}

function ImportTool() {
  const importMatches = useAppStore((state) => state.importMatches)
  const [filename, setFilename] = useState('')
  const [raw, setRaw] = useState('')
  const [rows, setRows] = useState<TableRows>([])
  const headers = rows[0] ?? []
  const bodyRows = useMemo(() => rows.slice(1), [rows])
  const [mapping, setMapping] = useState<Mapping>(emptyMapping)
  const [message, setMessage] = useState<string | null>(null)

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

  const canImport =
    mappedRows.length > 0 &&
    mapping.player1Name &&
    mapping.deck1Query &&
    mapping.player2Name &&
    mapping.deck2Query &&
    mapping.winnerName

  return (
    <section className="rounded-2xl bg-surface-elevated p-4">
      <h2 className="text-lg font-semibold">CSV / Excel 匯入</h2>
      <p className="mt-1 text-sm text-text-secondary">
        支援欄位 mapping preview；deck 欄可填 OP16 / ST21 / EB04 / leader 名 / 本地 alias。
      </p>
      <input
        className="mt-4 block w-full text-sm text-text-secondary"
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          if (!file) return
          try {
            const result = await readFileAsRows(file)
            setFilename(file.name)
            setRaw(result.raw)
            setRows(result.rows)
            setMapping(guessMapping(result.rows[0] ?? []))
            setMessage(`已讀取 ${result.rows.length - 1} 行資料`)
          } catch (caught) {
            setMessage(caught instanceof Error ? caught.message : '讀取檔案失敗')
          }
        }}
      />

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
            <p className="font-semibold text-text-primary">Preview</p>
            {mappedRows.slice(0, 3).map((row, index) => (
              <p key={index} className="mt-2">
                {row.player1Name} ({row.deck1Query}) vs {row.player2Name} ({row.deck2Query}) · 勝：
                {row.winnerName}
              </p>
            ))}
          </div>

          <Button
            className="mt-4"
            fullWidth
            disabled={!canImport}
            onClick={() => {
              const result = importMatches(mappedRows, filename || 'import.csv', raw)
              setMessage(
                `匯入完成：成功 ${result.importRecord.successCount}，錯誤 ${result.importRecord.errorCount}`,
              )
            }}
          >
            確認匯入
          </Button>
        </>
      ) : null}
      {message ? <p className="mt-3 text-sm text-text-secondary">{message}</p> : null}
    </section>
  )
}

export function DataTools() {
  return (
    <>
      <PlayerMergeTool />
      <ImportTool />
    </>
  )
}
