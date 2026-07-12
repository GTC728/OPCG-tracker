import { APP_VERSION, SCHEMA_VERSION } from '@/lib/constants'
import { uploadCloudSnapshot, isCloudConfigured, getCloudSession } from '@/lib/cloudSync'
import type { AppState } from '@/types'

export function shouldAutoBackupOnLogin(state: AppState): boolean {
  return shouldRunPeriodicBackup(state)
}

/** Periodic backup — uses backupReminderIntervalDays (default 7). */
export function shouldRunPeriodicBackup(state: AppState): boolean {
  if (state.settings.autoBackupOnLogin === false) return false
  const last = state.settings.lastCloudBackupAt
  if (!last) return true
  const intervalDays = state.settings.backupReminderIntervalDays ?? 7
  const elapsed = Date.now() - new Date(last).getTime()
  return elapsed >= intervalDays * 24 * 60 * 60 * 1000
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

/** Run cloud backup when interval elapsed; no-op if not logged in or disabled. */
export async function runPeriodicBackupIfNeeded(
  state: AppState,
  deviceLabel: string,
): Promise<AppState> {
  if (!isCloudConfigured() || !shouldRunPeriodicBackup(state)) return state
  const { user } = await getCloudSession()
  if (!user) return state
  return runAutoCloudBackup(state, deviceLabel)
}
