import {
  formatPercent,
  getReliabilityLabel,
  getWeightedWinRate,
  MIN_RELIABLE_SAMPLE,
} from '@/lib/stats'

export { MIN_RELIABLE_SAMPLE }

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

export function getSampleLabel(total: number): string {
  if (total === 0) return ''
  if (total < MIN_RELIABLE_SAMPLE) return `資料不足 · ${total}場`
  if (total <= 5) return `初步 · ${total}場`
  if (total <= 10) return `可參考 · ${total}場`
  return `可信 · ${total}場`
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
): string {
  const reliability = getReliabilityLabel(total)
  const smoothed = formatPercent(getWeightedWinRate(wins, total))
  const raw = formatPercent(rawWinRate)
  if (!isReliableSample(total)) {
    return `${reliability} · 平滑 ${smoothed}（實際 ${raw}）· ${wins}W-${losses}L`
  }
  return `${reliability} · ${smoothed} · ${wins}W-${losses}L`
}
