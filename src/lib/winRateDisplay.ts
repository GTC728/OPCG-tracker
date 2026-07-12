import { translate } from '@/lib/i18n'
import type { TranslationKey } from '@/lib/i18n'
import {
  formatPercent,
  getReliabilityLabel,
  getWeightedWinRate,
  MIN_RELIABLE_SAMPLE,
} from '@/lib/stats'
import { useAppStore } from '@/stores/appStore'

export { MIN_RELIABLE_SAMPLE }

type TranslateFn = (key: TranslationKey) => string

function defaultTranslate(key: TranslationKey): string {
  return translate(useAppStore.getState().settings.language, key)
}

export function isReliableSample(total: number): boolean {
  return total >= MIN_RELIABLE_SAMPLE
}

/** Bayesian-smoothed win rate for display; null when no games played. */
export function getDisplayWinRate(wins: number, total: number): number | null {
  if (total === 0) return null
  return getWeightedWinRate(wins, total)
}

/** Smoothed rate when only raw win rate is available (e.g. dashboard aggregates). */
export function getDisplayWinRateFromRaw(rawWinRate: number | null, total: number): number | null {
  if (total === 0 || rawWinRate === null) return null
  const wins = Math.round(rawWinRate * total)
  return getWeightedWinRate(wins, total)
}

export function getSampleLabel(total: number, t: TranslateFn = defaultTranslate): string {
  if (total === 0) return ''
  if (total < MIN_RELIABLE_SAMPLE) {
    return t('stats.sample.insufficient').replace('{n}', String(total))
  }
  if (total <= 5) return t('stats.sample.preliminary').replace('{n}', String(total))
  if (total <= 10) return t('stats.sample.reference').replace('{n}', String(total))
  return t('stats.sample.reliable').replace('{n}', String(total))
}

export function getWinRateHeatmapColor(wins: number, total: number): string {
  if (total === 0) return 'rgba(71, 85, 105, 0.35)'
  if (!isReliableSample(total)) return 'rgba(71, 85, 105, 0.22)'
  const winRate = getWeightedWinRate(wins, total)
  const opacity = 0.24 + Math.abs(winRate - 0.5) * 1.3
  return winRate >= 0.5 ? `rgba(34, 197, 94, ${opacity})` : `rgba(239, 68, 68, ${opacity})`
}

export function formatWinRateTooltip(
  wins: number,
  losses: number,
  total: number,
  rawWinRate: number | null,
  t: TranslateFn = defaultTranslate,
): string {
  const reliability = getReliabilityLabel(total, t)
  const smoothed = formatPercent(getWeightedWinRate(wins, total))
  const raw = formatPercent(rawWinRate)
  if (!isReliableSample(total)) {
    return t('stats.tooltip.smoothedRaw')
      .replace('{reliability}', reliability)
      .replace('{smoothed}', smoothed)
      .replace('{raw}', raw)
      .replace('{wins}', String(wins))
      .replace('{losses}', String(losses))
  }
  return t('stats.tooltip.standard')
    .replace('{reliability}', reliability)
    .replace('{smoothed}', smoothed)
    .replace('{wins}', String(wins))
    .replace('{losses}', String(losses))
}
