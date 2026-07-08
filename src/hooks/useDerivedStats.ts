import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  backlogExtrasFromState,
  computeAchievementSummary,
} from '@/lib/achievements'
import {
  getCachedAchievementLeaderboards,
  getCachedPlayerAchievementProgress,
  getPlayerProfileBundle,
  getScopedInsights,
  getScopedStatsBundle,
  pickAppDataSlice,
  type AppDataSlice,
  type StatsScope,
} from '@/lib/derivedData'
import { useAppStore } from '@/stores/appStore'
import type { AppState, Language } from '@/types'

export function useAppDataSlice(): AppDataSlice {
  return useAppStore(useShallow((state) => pickAppDataSlice(state)))
}

export function useScopedStats(scope: StatsScope) {
  const slice = useAppDataSlice()
  const language = useAppStore((state) => state.settings.language)
  return useMemo(() => getScopedStatsBundle(slice, scope, language), [slice, scope, language])
}

export function useScopedInsights(scope: StatsScope) {
  const slice = useAppDataSlice()
  const language = useAppStore((state) => state.settings.language)
  return useMemo(() => getScopedInsights(slice, scope, language), [slice, scope, language])
}

export function useSessionDashboard(sessionId: string | null, language: Language) {
  const slice = useAppDataSlice()
  return useMemo(() => {
    if (!sessionId) return null
    return getScopedStatsBundle(slice, { type: 'session', sessionId }, language).dashboard
  }, [slice, sessionId, language])
}

export function usePlayerProfileBundle(playerId: string, language: Language) {
  const slice = useAppDataSlice()
  return useMemo(() => getPlayerProfileBundle(slice, playerId, language), [slice, playerId, language])
}

export interface AchievementPanelData {
  achievements: ReturnType<typeof getCachedPlayerAchievementProgress>
  globalRates: ReturnType<typeof getCachedAchievementLeaderboards>['globalRates']
  peerRates: Array<{ playerId: string; name: string; rate: number }>
  summary: ReturnType<typeof computeAchievementSummary>
}

export function useAchievementPanelData(
  playerId: string,
  enabled: boolean,
  linkedPlayerId: string | null,
) {
  const slice = useAppDataSlice()
  const backlogExtras = useMemo(() => backlogExtrasFromState(slice as AppState), [slice])
  const [data, setData] = useState<AchievementPanelData | null>(null)

  useEffect(() => {
    if (!enabled) {
      setData(null)
      return
    }

    let cancelled = false
    setData(null)

    const compute = () => {
      if (cancelled) return
      const { globalRates, peerRateByPlayer } = getCachedAchievementLeaderboards(slice)
      const achievements = getCachedPlayerAchievementProgress(
        slice,
        playerId,
        linkedPlayerId,
        globalRates,
        backlogExtras,
      )
      const peerRates = slice.players
        .filter((p) => !p.archived && p.id !== playerId)
        .map((p) => ({
          playerId: p.id,
          name: p.name,
          rate: peerRateByPlayer.get(p.id) ?? 0,
        }))
        .sort((a, b) => b.rate - a.rate)

      setData({
        achievements,
        globalRates,
        peerRates,
        summary: computeAchievementSummary(achievements),
      })
    }

    const idleId =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback(compute, { timeout: 120 })
        : window.setTimeout(compute, 0)

    return () => {
      cancelled = true
      if (typeof requestIdleCallback === 'function' && typeof idleId === 'number') {
        cancelIdleCallback(idleId)
      } else {
        clearTimeout(idleId)
      }
    }
  }, [enabled, slice, playerId, linkedPlayerId, backlogExtras])

  return data
}

export function useAchievementPreview(
  playerId: string,
  linkedPlayerId: string | null,
) {
  const slice = useAppDataSlice()
  const backlogExtras = useMemo(() => backlogExtrasFromState(slice as AppState), [slice])

  return useMemo(
    () =>
      getCachedPlayerAchievementProgress(slice, playerId, linkedPlayerId, new Map(), backlogExtras),
    [slice, playerId, linkedPlayerId, backlogExtras],
  )
}
