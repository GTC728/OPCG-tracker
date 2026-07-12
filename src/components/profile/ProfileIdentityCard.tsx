import { Button } from '@/components/ui/Button'
import { RecentMatchWinStrip } from '@/components/profile/RecentMatchWinStrip'
import { formatStreakLine } from '@/components/profile/RecentFormBars'
import { useI18n } from '@/lib/i18n'
import { formatPercent, type RecentFormStat, type RecordStat, type WinStreakStats } from '@/lib/stats'
import { getDisplayWinRate } from '@/lib/winRateDisplay'
import { uiGlassCard, uiLink } from '@/lib/uiSurface'
import type { Match } from '@/types'

function getRecentWindowStat(recentForm: RecentFormStat[], windowSize: number): RecentFormStat | null {
  return recentForm.find((item) => item.label.includes(String(windowSize))) ?? recentForm[1] ?? recentForm[0] ?? null
}

export function ProfileIdentityCard({
  title,
  stat,
  streak,
  recentForm,
  recentMatches,
  playerId,
  onBack,
  backLabel,
  onShare,
  onViewDetails,
}: {
  title: string
  stat: RecordStat | null
  streak: WinStreakStats
  recentForm: RecentFormStat[]
  recentMatches: Match[]
  playerId: string
  onBack: () => void
  backLabel?: string
  onShare?: () => void
  onViewDetails: () => void
}) {
  const { t } = useI18n()
  const recent20 = getRecentWindowStat(recentForm, 20)
  const backText = backLabel ?? t('stats.backToStats')

  return (
    <section className={[uiGlassCard, 'px-3 py-2.5'].join(' ')}>
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
      <h2 className="mt-1.5 truncate text-base font-bold tracking-tight">{title}</h2>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <article className="rounded-lg border border-[var(--ui-border)] bg-surface/40 px-2 py-1.5 text-center">
          <p className="text-[10px] text-text-secondary">{t('stats.winRate')}</p>
          <p className="text-sm font-bold">{formatPercent(getDisplayWinRate(stat?.wins ?? 0, stat?.total ?? 0))}</p>
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
          <p className="text-[10px] text-text-secondary">{t('profile.recent20WinRateShort')}</p>
          <p className="text-sm font-bold">
            {recent20?.total ? formatPercent(recent20.winRate) : '—'}
          </p>
          {recent20?.total ? (
            <p className="text-[9px] text-text-secondary">{recent20.wins}/{recent20.total}</p>
          ) : null}
        </article>
      </div>
      <div className="mt-2.5 rounded-lg border border-[var(--ui-border)] bg-surface/30 px-2.5 py-2">
        <RecentMatchWinStrip matches={recentMatches} playerId={playerId} />
      </div>
      <button type="button" className={['mt-2 text-xs font-semibold', uiLink].join(' ')} onClick={onViewDetails}>
        {t('profile.viewOverview')} ›
      </button>
    </section>
  )
}
