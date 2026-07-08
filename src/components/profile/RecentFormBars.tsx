import type { TranslationKey } from '@/lib/i18n'
import { formatPercent, type RecentFormStat, type WinStreakStats } from '@/lib/stats'
import { uiGlassCard } from '@/lib/uiSurface'
import { useI18n } from '@/lib/i18n'

function formatStreakLine(streak: WinStreakStats, t: (key: TranslationKey) => string): string {
  if (streak.currentType === 'win' && streak.currentStreak > 0) {
    return `${streak.currentStreak}${t('stats.streakWinSuffix')}`
  }
  if (streak.currentType === 'loss' && streak.currentLossStreak > 0) {
    return `${streak.currentLossStreak}${t('stats.streakLossSuffix')}`
  }
  return '0'
}

export function RecentFormBars({ recentForm }: { recentForm: RecentFormStat[] }) {
  const { t } = useI18n()

  return (
    <article className={[uiGlassCard, 'space-y-2.5 p-3'].join(' ')}>
      {recentForm.map((item) => {
        const pct = item.winRate !== null ? Math.round(item.winRate * 100) : 0
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
              <span className="text-text-secondary">{item.label}</span>
              <span className="font-semibold">
                {item.total ? `${formatPercent(item.winRate)} · ${item.wins}/${item.total}` : '—'}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted/80">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: item.total ? `${pct}%` : '0%' }}
              />
            </div>
          </div>
        )
      })}
      {!recentForm.some((item) => item.total > 0) ? (
        <p className="text-sm text-text-secondary">{t('stats.noRecentMatches')}</p>
      ) : null}
    </article>
  )
}

/** @deprecated Use RecentFormBars — streak moved to ProfileIdentityCard */
export function TrendsPreviewCard({
  streak,
  recentForm,
}: {
  streak: WinStreakStats
  recentForm: RecentFormStat[]
}) {
  void streak
  return <RecentFormBars recentForm={recentForm} />
}

export { formatStreakLine }
