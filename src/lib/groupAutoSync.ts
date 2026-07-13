import {
  flushGroupCollabSyncNow,
  getGroupSyncEpoch,
  isGroupCollabActive,
  isGroupSyncStillActive,
  pullGroupCollabState,
} from '@/lib/groupSync'
import { getAppState, updateAppState } from '@/stores/appStore'

export type GroupSyncTrigger = 'init' | 'visibility' | 'online' | 'interval' | 'manual'

const MIN_PULL_INTERVAL_MS = 10_000
const MIN_FLUSH_INTERVAL_MS = 3_000

let lastPullAt = 0
let lastFlushAt = 0
let syncInFlight = false

export function resetGroupAutoSyncClocks(): void {
  lastPullAt = 0
  lastFlushAt = 0
}

export async function runGroupForegroundSync(
  groupCode: string,
  trigger: GroupSyncTrigger,
): Promise<void> {
  if (!groupCode || !isGroupCollabActive(getAppState())) return
  if (syncInFlight && trigger !== 'manual') return

  const epoch = getGroupSyncEpoch()
  syncInFlight = true
  const now = Date.now()
  try {
    if (!isGroupSyncStillActive(groupCode, epoch)) return

    const force = trigger === 'manual' || trigger === 'init'
    const shouldFlush = force || now - lastFlushAt >= MIN_FLUSH_INTERVAL_MS
    if (shouldFlush) {
      flushGroupCollabSyncNow(groupCode)
      lastFlushAt = Date.now()
    }

    if (!isGroupSyncStillActive(groupCode, epoch)) return

    const shouldPull = force || now - lastPullAt >= MIN_PULL_INTERVAL_MS
    if (!shouldPull) return

    await pullGroupCollabState(groupCode, undefined, epoch)
    if (!isGroupSyncStillActive(groupCode, epoch)) return

    lastPullAt = Date.now()
    const pulledAt = new Date().toISOString()
    updateAppState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        lastGroupPullAt: pulledAt,
        lastGroupSyncAt: pulledAt,
        lastGroupSyncError: null,
      },
    }))
  } catch (error) {
    if (!isGroupSyncStillActive(groupCode, epoch)) return
    const message = error instanceof Error ? error.message : 'Group sync failed'
    updateAppState((state) => ({
      ...state,
      settings: { ...state.settings, lastGroupSyncError: message },
    }))
    throw error
  } finally {
    syncInFlight = false
  }
}
