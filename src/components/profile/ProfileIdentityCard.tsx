import { Button } from '@/components/ui/Button'
import { formatStreakLine } from '@/components/profile/RecentFormBars'
import { useI18n } from '@/lib/i18n'
import { formatPercent, type RecentFormStat, type RecordStat, type WinStreakStats } from '@/lib/stats'
import { uiGlassCard, uiLink } from '@/lib/uiSurface'

function getDisplayWinRate(winRate: number | null, total: number): number | null {
  return total > 0 ? winRate : null
}

function getRecentWindowStat(recentForm: RecentFormStat[], windowSize: number): RecentFormStat | null {
  return recentForm.find((item) => item.label.includes(String(windowSize))) ?? recentForm[1] ?? recentForm[0] ?? null
}

export function ProfileIdentityCard({
  title,
  stat,
  streak,
  recentForm,
  onBack,
  onShare,
  onViewDetails,
}: {
  title: string
  stat: RecordStat | null
  streak: WinStreakStats
  recentForm: RecentFormStat[]
  onBack: () => void
  onShare?: () => void
  onViewDetails: () => void
}) {
  const { t } = useI18n()
  const recent10 = getRecentWindowStat(recentForm, 10)

  return (
    <section className={[uiGlassCard, 'px-3 py-2.5'].join(' ')}>
      <div className="flex items-center gap-2">
        <button type="button" className={['shrink-0 text-xs font-semibold', uiLink].join(' ')} onClick={onBack}>
          ← {t('stats.backToStats')}
        </button>
        {onShare ? (
          <Button variant="ghost" className="ml-auto min-h-8 px-2.5 py-1 text-xs" onClick={onShare}>
            {t('share.exportShort')}
          </Button>
        ) : null}
      </div>
      <h2 className="mt-1.5 truncate text-base font-bold tracking-tight">{title}</h2>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <article className="rounded-lg border border-[var(--ui-border)] bg-surface/40 px-2 py-1.5 text-center">
          <p className="text-[10px] text-text-secondary">{t('stats.winRate')}</p>
          <p className="text-sm font-bold">{formatPercent(getDisplayWinRate(stat?.winRate ?? null, stat?.total ?? 0))}</p>
        </article>
        <article className="rounded-lg border border-[var(--ui-border)] bg-surface/40 px-2 py-1.5 text-center">
          <p className="text-[10px] text-text-secondary">{t('stats.record')}</p>
          <p className="text-sm font-bold">
            {stat?.wins ?? 0}W-{stat?.losses ?? 0}L
          </p>
        </article>
        <article className="rounded-lg border border-[var(--ui-border)] bg-surface/40 px-2 py-1.5 text-center">
          <p className="text-[10px] text-text-secondary">{t('stats.matchesUnit')}</p>
          <p className="text-sm font-bold">{stat?.total ?? 0}</p>
        </article>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <article className="rounded-lg border border-[var(--ui-border)] bg-surface/40 px-2 py-1.5 text-center">
          <p className="text-[10px] text-text-secondary">{t('stats.currentStreak')}</p>
          <p className="text-sm font-bold">{formatStreakLine(streak, t)}</p>
        </article>
        <article className="rounded-lg border border-[var(--ui-border)] bg-surface/40 px-2 py-1.5 text-center">
          <p className="text-[10px] text-text-secondary">{t('stats.longestStreak')}</p>
          <p className="text-sm font-bold">{streak.longestStreak > 0 ? streak.longestStreak : '0'}</p>
        </article>
        <article className="rounded-lg border border-[var(--ui-border)] bg-surface/40 px-2 py-1.5 text-center">
          <p className="text-[10px] text-text-secondary">{t('profile.recentFormShort')}</p>
          <p className="text-sm font-bold">
            {recent10?.total ? formatPercent(recent10.winRate) : '—'}
          </p>
          {recent10?.total ? (
            <p className="text-[9px] text-text-secondary">{recent10.wins}/{recent10.total}</p>
          ) : null}
        </article>
      </div>
      <button type="button" className={['mt-2 text-xs font-semibold', uiLink].join(' ')} onClick={onViewDetails}>
        {t('profile.viewOverview')} ›
      </button>
    </section>
  )
}
