import type { AppSettings, StatsPeriodQuarter, StatsScopeTab } from '@/types'
import {
  CUSTOM_SEASON_ID,
  type PeriodMode,
  latestOpSeasonId,
  mapPresetAcrossOpSubdivide,
} from '@/lib/seasons'

export type ResolvedStatsPeriod = {
  mode: PeriodMode
  presetId: string
  opSubdivide: boolean
  selectedYear: number | null
  selectedQuarter: StatsPeriodQuarter | null
  customFrom: string
  customTo: string
}

export function resolveStatsPeriodSettings(settings: AppSettings): ResolvedStatsPeriod {
  const mode = settings.statsPeriodMode ?? 'op'
  const opSubdivide = settings.statsPeriodOpSubdivide ?? false
  const selectedYear = settings.statsPeriodYear ?? null
  const selectedQuarter = settings.statsPeriodQuarter ?? null
  const presetId = settings.statsPeriodPresetId ?? latestOpSeasonId()

  return {
    mode,
    presetId,
    opSubdivide,
    selectedYear,
    selectedQuarter,
    customFrom: settings.statsPeriodCustomFrom ?? '',
    customTo: settings.statsPeriodCustomTo ?? '',
  }
}

export function resolveStatsScopeTab(
  settings: AppSettings,
  fallback: StatsScopeTab,
): StatsScopeTab {
  return settings.statsScopeTab ?? fallback
}

export function effectivePeriodFilter(period: ResolvedStatsPeriod): {
  mode: PeriodMode
  presetId: string
} {
  if (period.mode === 'year') {
    if (period.selectedYear == null) {
      return { mode: 'op', presetId: period.presetId }
    }
    return { mode: 'year', presetId: String(period.selectedYear) }
  }
  if (period.mode === 'quarter') {
    if (period.selectedYear == null || period.selectedQuarter == null) {
      return { mode: 'op', presetId: period.presetId }
    }
    return {
      mode: 'quarter',
      presetId: `${period.selectedYear}-q${period.selectedQuarter}`,
    }
  }
  return { mode: 'op', presetId: period.presetId }
}

export function patchStatsPeriodSettings(
  current: AppSettings,
  patch: Partial<
    Pick<
      AppSettings,
      | 'statsPeriodMode'
      | 'statsPeriodPresetId'
      | 'statsPeriodOpSubdivide'
      | 'statsPeriodYear'
      | 'statsPeriodQuarter'
      | 'statsPeriodCustomFrom'
      | 'statsPeriodCustomTo'
      | 'statsScopeTab'
    >
  >,
): Partial<AppSettings> {
  const next = { ...patch }
  if (patch.statsPeriodOpSubdivide != null && current.statsPeriodPresetId) {
    next.statsPeriodPresetId = mapPresetAcrossOpSubdivide(
      current.statsPeriodPresetId,
      patch.statsPeriodOpSubdivide,
    )
  }
  if (patch.statsPeriodPresetId && patch.statsPeriodPresetId !== CUSTOM_SEASON_ID) {
    next.statsPeriodMode = 'op'
  }
  return next
}
