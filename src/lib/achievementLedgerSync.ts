import { mergeAchievementUnlocks, reconcileAchievementUnlocks } from '@/lib/achievements'
import { getCloudSession, getSupabaseClient, isCloudConfigured } from '@/lib/cloudSync'
import { isTestGroupCode } from '@/lib/groupTest'
import { unlocksForProfile } from '@/lib/profileIdentity'
import type { AchievementUnlock, AppState } from '@/types'

type LedgerRow = {
  profile_identity_id: string
  achievement_id: string
  level: number
  unlocked_at: string
  trust_tier: string
  backfilled: boolean
  user_id: string
}

function unlocksToLedgerRows(
  unlocks: AchievementUnlock[],
  userId: string,
): Omit<LedgerRow, 'backfilled'>[] {
  return unlocks
    .filter((item) => !item.provisional && item.level > 0)
    .map((item) => ({
      profile_identity_id: item.profileIdentityId,
      achievement_id: item.achievementId,
      level: item.level,
      unlocked_at: item.unlockedAt,
      trust_tier: 'self',
      user_id: userId,
    }))
}

function ledgerRowsToUnlocks(rows: LedgerRow[], playerId: string): AchievementUnlock[] {
  return rows.map((row) => ({
    achievementId: row.achievement_id,
    playerId,
    profileIdentityId: row.profile_identity_id,
    level: row.level,
    unlockedAt: row.unlocked_at,
  }))
}

export async function pullAchievementLedger(
  profileIdentityId: string,
  linkedPlayerId: string,
): Promise<AchievementUnlock[]> {
  const supabase = await getSupabaseClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('profile_achievement_unlocks')
    .select('profile_identity_id, achievement_id, level, unlocked_at, trust_tier, backfilled, user_id')
    .eq('profile_identity_id', profileIdentityId)
  if (error) {
    console.warn('pullAchievementLedger failed', error)
    return []
  }
  return ledgerRowsToUnlocks((data ?? []) as LedgerRow[], linkedPlayerId)
}

export async function pushAchievementLedger(state: AppState, userId: string): Promise<void> {
  const profileId = state.settings.profileIdentityId
  const linkedId = state.settings.linkedPlayerId
  if (!profileId || !linkedId) return

  const supabase = await getSupabaseClient()
  if (!supabase) return

  const unlocks = unlocksForProfile(state.achievementUnlocks, profileId)
  const rows = unlocksToLedgerRows(unlocks, userId)
  if (!rows.length) return

  const { error } = await supabase.from('profile_achievement_unlocks').upsert(
    rows.map((row) => ({ ...row, backfilled: false })),
    { onConflict: 'profile_identity_id,achievement_id' },
  )
  if (error) throw error
}

/**
 * Pull server ledger → merge → reconcile from matches → push.
 * Matches remain source of truth; server stores cross-device cache.
 */
export async function syncAchievementLedger(state: AppState): Promise<AppState> {
  if (!isCloudConfigured()) return state
  if (isTestGroupCode(state.settings.lastGroupCode)) return state

  const profileId = state.settings.profileIdentityId
  const linkedId = state.settings.linkedPlayerId
  if (!profileId || !linkedId) return state

  const { user } = await getCloudSession()
  if (!user) return state

  const pulled = await pullAchievementLedger(profileId, linkedId)
  let next: AppState = {
    ...state,
    achievementUnlocks: mergeAchievementUnlocks(state.achievementUnlocks, pulled),
  }
  next = reconcileAchievementUnlocks(next, linkedId).state
  await pushAchievementLedger(next, user.id)
  return next
}

let ledgerSyncTimer: ReturnType<typeof setTimeout> | null = null
let ledgerSyncRunning = false

/** Debounced async sync — safe to call after any reconcile. */
export function scheduleAchievementLedgerSync(): void {
  if (ledgerSyncTimer) clearTimeout(ledgerSyncTimer)
  ledgerSyncTimer = setTimeout(() => {
    ledgerSyncTimer = null
    void runAchievementLedgerSync()
  }, 600)
}

async function runAchievementLedgerSync(): Promise<void> {
  if (ledgerSyncRunning) return
  ledgerSyncRunning = true
  try {
    const { getAppState, updateAppState } = await import('@/stores/appStore')
    const current = getAppState()
    const next = await syncAchievementLedger(current)
    if (next.achievementUnlocks !== current.achievementUnlocks) {
      updateAppState(() => next)
    }
  } catch (error) {
    console.warn('achievement ledger sync failed', error)
  } finally {
    ledgerSyncRunning = false
  }
}
