import { useI18n } from '@/lib/i18n'
import { formatPercent } from '@/lib/stats'
import { formatWinLossRecord } from '@/lib/winLossRecord'
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
  const losses = recent.length - wins
  const winRate = recent.length ? wins / recent.length : null

  if (!recent.length) {
    return <p className="text-[11px] text-text-secondary">{t('stats.noRecentMatches')}</p>
  }

  const ordered = [...recent].reverse()

  return (
    <div className="space-y-2.5">
      <div
        className="flex h-2 overflow-hidden rounded-full"
        role="img"
        aria-label={`${t('profile.recent20Matches')}: ${formatWinLossRecord(wins, losses)}`}
      >
        {ordered.map((match) => {
          const won = match.winnerPlayerId === playerId
          return (
            <span
              key={match.id}
              title={won ? 'W' : 'L'}
              className={['min-w-[3px] flex-1', won ? 'bg-success/85' : 'bg-danger/75'].join(' ')}
            />
          )
        })}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] text-text-secondary">{t('stats.winRate')}</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatPercent(winRate)}</p>
        </div>
        <div>
          <p className="text-[10px] text-text-secondary">{t('stats.wins')}</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-success">{wins}</p>
        </div>
        <div>
          <p className="text-[10px] text-text-secondary">{t('stats.losses')}</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-danger">{losses}</p>
        </div>
      </div>
    </div>
  )
}
