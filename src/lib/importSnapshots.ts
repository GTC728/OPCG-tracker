import { importAppStateJson } from '@/lib/storage'
import type { AppState, ImportSnapshotMeta } from '@/types'

const STORAGE_KEY = 'opcg-import-snapshots-v1'
const MAX_SNAPSHOTS = 5

type StoredSnapshot = ImportSnapshotMeta & { stateJson: string }

function readAll(): StoredSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredSnapshot[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(items: StoredSnapshot[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_SNAPSHOTS)))
}

export function listImportSnapshots(): ImportSnapshotMeta[] {
  return readAll().map(({ id, label, createdAt, matchCount, playerCount }) => ({
    id,
    label,
    createdAt,
    matchCount,
    playerCount,
  }))
}

export function saveImportSnapshot(state: AppState, label: string): ImportSnapshotMeta {
  const meta: StoredSnapshot = {
    id: crypto.randomUUID(),
    label,
    createdAt: new Date().toISOString(),
    matchCount: state.matches.filter((m) => m.deletedAt === null).length,
    playerCount: state.players.filter((p) => !p.deletedAt).length,
    stateJson: JSON.stringify(state),
  }
  writeAll([meta, ...readAll()])
  return {
    id: meta.id,
    label: meta.label,
    createdAt: meta.createdAt,
    matchCount: meta.matchCount,
    playerCount: meta.playerCount,
  }
}

export function loadImportSnapshot(id: string): AppState | null {
  const item = readAll().find((entry) => entry.id === id)
  if (!item) return null
  try {
    return importAppStateJson(item.stateJson)
  } catch {
    return null
  }
}

export function deleteImportSnapshot(id: string): void {
  writeAll(readAll().filter((entry) => entry.id !== id))
}
