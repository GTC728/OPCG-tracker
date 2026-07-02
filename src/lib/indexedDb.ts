import Dexie, { type Table } from 'dexie'
import { STORAGE_KEY } from '@/lib/constants'
import type { AppState } from '@/types'

interface AppStateRecord {
  key: string
  state: AppState
  updatedAt: string
}

class OpcgTrackerDatabase extends Dexie {
  appState!: Table<AppStateRecord, string>

  constructor() {
    super('opcg-tracker')
    this.version(1).stores({
      appState: '&key, updatedAt',
    })
  }
}

export const opcgDb = new OpcgTrackerDatabase()

export async function loadIndexedAppState(): Promise<AppState | null> {
  const record = await opcgDb.appState.get(STORAGE_KEY)
  return record?.state ?? null
}

export async function saveIndexedAppState(state: AppState): Promise<void> {
  await opcgDb.appState.put({
    key: STORAGE_KEY,
    state,
    updatedAt: new Date().toISOString(),
  })
}

export async function clearIndexedAppState(): Promise<void> {
  await opcgDb.appState.delete(STORAGE_KEY)
}
