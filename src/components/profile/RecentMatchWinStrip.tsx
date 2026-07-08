import { useI18n } from '@/lib/i18n'
import { formatPercent } from '@/lib/stats'
import type { Match } from '@/types'

const RECENT_MATCH_WINDOW = 20

export function RecentMatchWinStrip({
  matches,
  playerId,
}: {
  matches: Match[]
  playerId: string
}) {
  const { t } = useI18n()
  const recent = matches.slice(0, RECENT_MATCH_WINDOW)
  const wins = recent.filter((match) => match.winnerPlayerId === playerId).length
  const winRate = recent.length ? wins / recent.length : null

  if (!recent.length) {
    return <p className="text-[11px] text-text-secondary">{t('stats.noRecentMatches')}</p>
  }

  const ordered = [...recent].reverse()

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-text-secondary">{t('profile.recent20Matches')}</span>
        <span className="font-semibold tabular-nums">
          {formatPercent(winRate)} · {wins}/{recent.length}
        </span>
      </div>
      <div
        className="flex items-end gap-0.5"
        role="img"
        aria-label={`${t('profile.recent20Matches')}: ${wins}W-${recent.length - wins}L`}
      >
        {ordered.map((match) => {
          const won = match.winnerPlayerId === playerId
          return (
            <span
              key={match.id}
              title={won ? 'W' : 'L'}
              className={[
                'min-w-0 flex-1 rounded-sm',
                won ? 'bg-success/85' : 'bg-danger/75',
              ].join(' ')}
              style={{ height: won ? '1.125rem' : '0.625rem' }}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-[9px] text-text-secondary">
        <span>{t('profile.recentOlder')}</span>
        <span>{t('profile.recentNewer')}</span>
      </div>
    </div>
  )
}

export function Recent20WinRateBar({
  wins,
  total,
  winRate,
}: {
  wins: number
  total: number
  winRate: number | null
}) {
  const { t } = useI18n()
  const pct = winRate !== null ? Math.round(winRate * 100) : 0

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
        <span className="text-text-secondary">{t('profile.recent20WinRate')}</span>
        <span className="font-semibold tabular-nums">
          {total ? `${formatPercent(winRate)} · ${wins}/${total}` : '—'}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted/80">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: total ? `${pct}%` : '0%' }}
        />
      </div>
    </div>
  )
}
