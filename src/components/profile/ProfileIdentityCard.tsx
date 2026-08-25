import { Button } from '@/components/ui/Button'
import { WinLossRecord } from '@/components/match/WinLossRecord'
import { formatStreakLine } from '@/components/profile/RecentFormBars'
import { useI18n } from '@/lib/i18n'
import { CountUp } from '@/components/motion/CountUp'
import { formatPercent, type RecordStat, type WinStreakStats } from '@/lib/stats'
import { getDisplayWinRate } from '@/lib/winRateDisplay'
import { uiLink, uiMetricHero, uiPageEyebrow } from '@/lib/uiSurface'

export function ProfileIdentityCard({
  title,
  stat,
  streak,
  sessionCount,
  onBack,
  backLabel,
  onShare,
  onViewDetails,
}: {
  title: string
  stat: RecordStat | null
  streak: WinStreakStats
  sessionCount: number
  onBack: () => void
  backLabel?: string
  onShare?: () => void
  onViewDetails?: () => void
}) {
  const { t } = useI18n()
  const backText = backLabel ?? t('stats.backToStats')
  const wins = stat?.wins ?? 0
  const losses = stat?.losses ?? 0
  const winRate = getDisplayWinRate(wins, stat?.total ?? 0)

  return (
    <section className={[uiMetricHero, 'space-y-4 p-4'].join(' ')}>
      <div className="flex items-center gap-2">
        <button type="button" className={['shrink-0 text-xs font-semibold', uiLink].join(' ')} onClick={onBack}>
          ← {backText}
        </button>
        {onShare ? (
          <Button variant="ghost" className="ml-auto min-h-8 px-2.5 py-1 text-xs" onClick={onShare}>
            {t('share.exportShort')}
          </Button>
        ) : null}
      </div>

      <div>
        <p className={uiPageEyebrow}>{t('stats.section.players')}</p>
        <h2 className="mt-1 truncate text-2xl font-bold tracking-tight">{title}</h2>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs text-text-secondary">{t('stats.sessionCount')}</p>
          <p className="mt-1 truncate text-sm font-bold tabular-nums sm:text-lg">
            <CountUp value={sessionCount} />
          </p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-text-secondary">{t('stats.record')}</p>
          <p className="mt-1 truncate text-sm font-bold tabular-nums sm:text-lg">
            <WinLossRecord wins={wins} losses={losses} />
          </p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-text-secondary">{t('stats.winRate')}</p>
          <p className="mt-1 truncate text-sm font-bold tabular-nums sm:text-lg">
            {winRate === null ? formatPercent(null) : <CountUp value={winRate * 100} format={(n) => `${n.toFixed(1)}%`} />}
          </p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-text-secondary">{t('stats.currentStreak')}</p>
          <p className="mt-1 truncate text-sm font-bold tabular-nums sm:text-lg">{formatStreakLine(streak, t)}</p>
        </div>
      </div>

      {onViewDetails ? (
        <button type="button" className={['text-xs font-semibold', uiLink].join(' ')} onClick={onViewDetails}>
          {t('profile.viewOverview')} ›
        </button>
      ) : null}
    </section>
  )
}
