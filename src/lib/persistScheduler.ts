import { notifyGroupCollabChange } from '@/lib/groupSync'
import { saveAppState } from '@/lib/storage'
import type { AppState } from '@/types'

const DEBOUNCE_MS = 150

let pendingState: AppState | null = null
let lastFlushedState: AppState | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function initPersistScheduler(initial: AppState): void {
  lastFlushedState = initial
  pendingState = null
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

export function getLastPersistedState(): AppState | null {
  return lastFlushedState
}

export function schedulePersist(state: AppState, immediate = false): void {
  pendingState = state
  if (immediate) {
    flushPersistNow()
    return
  }
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(flushPersistNow, DEBOUNCE_MS)
}

export function flushPersistNow(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (!pendingState) return
  const prev = lastFlushedState
  const next = pendingState
  pendingState = null
  saveAppState(next)
  lastFlushedState = next
  notifyGroupCollabChange(prev, next)
}
