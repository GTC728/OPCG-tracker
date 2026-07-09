import { APP_VERSION, SCHEMA_VERSION } from '@/lib/constants'
import { uploadCloudSnapshot } from '@/lib/cloudSync'
import type { AppState } from '@/types'

const AUTO_BACKUP_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000

export function shouldAutoBackupOnLogin(state: AppState): boolean {
  if (state.settings.autoBackupOnLogin === false) return false
  const last = state.settings.lastCloudBackupAt
  if (!last) return true
  const elapsed = Date.now() - new Date(last).getTime()
  return elapsed >= AUTO_BACKUP_MIN_INTERVAL_MS
}

export function markCloudBackupCompleted(state: AppState): AppState {
  return {
    ...state,
    settings: {
      ...state.settings,
      lastCloudBackupAt: new Date().toISOString(),
      lastBackupReminder: new Date().toISOString(),
    },
  }
}

/** Upload personal snapshot; returns updated state with backup timestamp. */
export async function runAutoCloudBackup(
  state: AppState,
  deviceLabel: string,
): Promise<AppState> {
  await uploadCloudSnapshot(
    { ...state, schemaVersion: SCHEMA_VERSION, appVersion: APP_VERSION },
    deviceLabel,
  )
  return markCloudBackupCompleted(state)
}

export function backupAgeDays(state: AppState): number | null {
  const last = state.settings.lastCloudBackupAt ?? state.settings.lastBackupReminder
  if (!last) return null
  return Math.floor((Date.now() - new Date(last).getTime()) / (24 * 60 * 60 * 1000))
}

export function needsBackupReminder(state: AppState): boolean {
  const interval = state.settings.backupReminderIntervalDays ?? 7
  const age = backupAgeDays(state)
  if (age === null) return true
  return age >= interval
}
