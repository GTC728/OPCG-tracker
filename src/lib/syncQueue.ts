import Dexie, { type Table } from 'dexie'
import type { ActiveMatch, Match, Player, Session } from '@/types'

export type SyncQueueOp =
  | { kind: 'upsert_active'; groupCode: string; matchIds: string[] }
  | { kind: 'delete_active'; groupCode: string; matchId: string }
  | { kind: 'upsert_matches'; groupCode: string; matchIds: string[] }
  | { kind: 'upsert_players'; groupCode: string; playerIds: string[] }
  | { kind: 'delete_player'; groupCode: string; playerId: string }
  | { kind: 'upsert_sessions'; groupCode: string; sessionIds: string[] }
  | { kind: 'merge_players'; groupCode: string; sourcePlayerId: string; targetPlayerId: string }

export interface SyncQueueRecord {
  id: string
  op: SyncQueueOp
  createdAt: string
  attempts: number
  lastError: string | null
}

class SyncQueueDatabase extends Dexie {
  queue!: Table<SyncQueueRecord, string>

  constructor() {
    super('opcg-tracker-sync')
    this.version(1).stores({
      queue: '&id, createdAt',
    })
  }
}

const syncDb = new SyncQueueDatabase()

type SyncStatusListener = (pendingCount: number) => void
const listeners = new Set<SyncStatusListener>()
let cachedPendingCount = 0

function emitPendingCount(count: number): void {
  cachedPendingCount = count
  for (const listener of listeners) {
    listener(count)
  }
}

async function refreshPendingCount(): Promise<number> {
  const count = await syncDb.queue.count()
  emitPendingCount(count)
  return count
}

export function subscribeSyncPendingCount(listener: SyncStatusListener): () => void {
  listener(cachedPendingCount)
  listeners.add(listener)
  void refreshPendingCount()
  return () => {
    listeners.delete(listener)
  }
}

export function getCachedSyncPendingCount(): number {
  return cachedPendingCount
}

function createQueueId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export async function enqueueSyncOp(op: SyncQueueOp): Promise<void> {
  await syncDb.queue.add({
    id: createQueueId(),
    op,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  })
  await refreshPendingCount()
}

export async function listSyncQueue(): Promise<SyncQueueRecord[]> {
  return syncDb.queue.orderBy('createdAt').toArray()
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  await syncDb.queue.delete(id)
  await refreshPendingCount()
}

export async function markSyncQueueFailed(id: string, error: string): Promise<void> {
  const record = await syncDb.queue.get(id)
  if (!record) return
  await syncDb.queue.put({
    ...record,
    attempts: record.attempts + 1,
    lastError: error,
  })
}

export async function clearSyncQueue(): Promise<void> {
  await syncDb.queue.clear()
  await refreshPendingCount()
}

export type { ActiveMatch, Match, Player, Session }
