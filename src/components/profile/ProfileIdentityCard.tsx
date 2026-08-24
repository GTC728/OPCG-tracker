import { Button } from '@/components/ui/Button'
import { formatStreakLine } from '@/components/profile/RecentFormBars'
import { useI18n } from '@/lib/i18n'
import { formatPercent, type RecordStat, type WinStreakStats } from '@/lib/stats'
import { getDisplayWinRate } from '@/lib/winRateDisplay'
import { uiLink, uiMetricHero, uiPageEyebrow } from '@/lib/uiSurface'

export function ProfileIdentityCard({
  title,
  stat,
  streak,
  onBack,
  backLabel,
  onShare,
  onViewDetails,
}: {
  title: string
  stat: RecordStat | null
  streak: WinStreakStats
  onBack: () => void
  backLabel?: string
  onShare?: () => void
  onViewDetails?: () => void
}) {
  const { t } = useI18n()
  const backText = backLabel ?? t('stats.backToStats')

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

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-text-secondary">{t('stats.winRate')}</p>
          <p className="mt-1 text-lg font-bold">
            {formatPercent(getDisplayWinRate(stat?.wins ?? 0, stat?.total ?? 0))}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">{t('stats.record')}</p>
          <p className="mt-1 text-lg font-bold">
            {stat?.wins ?? 0}-{stat?.losses ?? 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">{t('stats.currentStreak')}</p>
          <p className="mt-1 text-lg font-bold">{formatStreakLine(streak, t)}</p>
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
