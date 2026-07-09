import Dexie, { type Table } from 'dexie'
import { LEGACY_STORAGE_KEY, OFFLINE_GROUP_KEY, PERSONAL_STORAGE_KEY } from '@/lib/appStateLayers'
import type { GroupScopedSnapshot } from '@/lib/groupScope'
import type { PersonalAppState } from '@/lib/appStateLayers'

interface PersonalRecord {
  key: string
  state: PersonalAppState
  updatedAt: string
}

interface GroupRecord {
  groupKey: string
  state: GroupScopedSnapshot
  updatedAt: string
}

interface LegacyRecord {
  key: string
  state: unknown
  updatedAt: string
}

class OpcgTrackerDatabase extends Dexie {
  personal!: Table<PersonalRecord, string>
  groupStates!: Table<GroupRecord, string>
  legacy!: Table<LegacyRecord, string>

  constructor() {
    super('opcg-tracker')
    this.version(1).stores({
      appState: '&key, updatedAt',
    })
    this.version(2).stores({
      appState: null,
      personal: '&key, updatedAt',
      groupStates: '&groupKey, updatedAt',
      legacy: '&key, updatedAt',
    }).upgrade(async (tx) => {
      const legacyTable = tx.table('appState') as Table<LegacyRecord, string> | undefined
      if (!legacyTable) return
      const legacy = await legacyTable.get(LEGACY_STORAGE_KEY)
      if (legacy) {
        await tx.table('legacy').put({
          key: LEGACY_STORAGE_KEY,
          state: legacy.state,
          updatedAt: legacy.updatedAt ?? new Date().toISOString(),
        })
      }
    })
  }
}

export const opcgDb = new OpcgTrackerDatabase()

export async function loadPersonalState(): Promise<PersonalAppState | null> {
  const record = await opcgDb.personal.get(PERSONAL_STORAGE_KEY)
  return record?.state ?? null
}

export async function savePersonalState(state: PersonalAppState): Promise<void> {
  await opcgDb.personal.put({
    key: PERSONAL_STORAGE_KEY,
    state,
    updatedAt: new Date().toISOString(),
  })
}

export async function loadGroupScopedState(groupKey: string): Promise<GroupScopedSnapshot | null> {
  const record = await opcgDb.groupStates.get(groupKey)
  return record?.state ?? null
}

export async function saveGroupScopedState(
  groupKey: string,
  state: GroupScopedSnapshot,
): Promise<void> {
  await opcgDb.groupStates.put({
    groupKey,
    state,
    updatedAt: new Date().toISOString(),
  })
}

export async function loadOfflineGroupState(): Promise<GroupScopedSnapshot | null> {
  return loadGroupScopedState(OFFLINE_GROUP_KEY)
}

export async function saveOfflineGroupState(state: GroupScopedSnapshot): Promise<void> {
  await saveGroupScopedState(OFFLINE_GROUP_KEY, state)
}

export async function loadLegacyMonolithState(): Promise<unknown | null> {
  const fromLegacy = await opcgDb.legacy.get(LEGACY_STORAGE_KEY)
  return fromLegacy?.state ?? null
}

export async function clearLegacyMonolithState(): Promise<void> {
  await opcgDb.legacy.delete(LEGACY_STORAGE_KEY)
}

/** Cached group workspace keys (excludes offline/local). */
export async function listKnownGroupKeys(): Promise<string[]> {
  const keys = await opcgDb.groupStates.toCollection().primaryKeys()
  return keys.filter((key) => key !== OFFLINE_GROUP_KEY)
}
