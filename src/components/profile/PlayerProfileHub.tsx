import { useState, type ReactNode } from 'react'
import { AchievementsPreviewRail, AchievementsWall } from '@/components/achievements/AchievementsWall'
import { MatchListItem } from '@/components/match/MatchResultRow'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { DeckUsagePieChart } from '@/components/stats/DeckUsagePieChart'
import { WeeklyWinRateChart, WinStreakSummary } from '@/components/stats/PlayerTrendCharts'
import {
  computeGlobalAchievementRates,
  computePerPlayerAchievementRates,
  computeAchievementSummary,
  getPlayerAchievementProgress,
} from '@/lib/achievements'
import type { AchievementPeerRate } from '@/lib/achievements'
import type { AchievementPeerContext } from '@/components/achievements/AchievementsWall'
import { useI18n } from '@/lib/i18n'
import {
  buildDeckUsageDistribution,
  buildHeadToHeadStats,
  buildPlayerDeckStats,
  buildPlayerStats,
  buildRecentForm,
  buildWeeklyWinRateStats,
  buildWinStreakStats,
  formatPercent,
  getCompletedMatches,
  type RecordStat,
} from '@/lib/stats'
import { uiCard, uiCardInteractive, uiGlassCard, uiSectionTitle } from '@/lib/uiSurface'
import type { AchievementUnlock, Deck, Language, Match, Player } from '@/types'

type ProfilePanel = 'overview' | 'trends' | 'decks' | 'matches' | 'achievements' | 'rivals' | null

function ProfilePreviewCard({
  title,
  value,
  detail,
  onClick,
}: {
  title: string
  value: string
  detail?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={[uiCardInteractive, 'flex h-full min-w-[8.5rem] shrink-0 flex-col p-3 text-left'].join(' ')}
      onClick={onClick}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">{title}</p>
      <p className="mt-1 text-xl font-bold tracking-tight">{value}</p>
      {detail ? <p className="mt-1 line-clamp-2 text-[11px] text-text-secondary">{detail}</p> : null}
      <span className="mt-auto pt-2 text-[10px] font-semibold text-brand-400">詳情 ›</span>
    </button>
  )
}

function PanelSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4">{children}</div>
    </BottomSheet>
  )
}

function getSampleLabel(total: number): string {
  if (total === 0) return ''
  if (total < 3) return `資料不足 · ${total}場`
  if (total <= 5) return `初步 · ${total}場`
  if (total <= 10) return `可參考 · ${total}場`
  return `可信 · ${total}場`
}

function getDisplayWinRate(winRate: number | null, total: number): number | null {
  return total > 0 ? winRate : null
}

export function PlayerProfileHub({
  player,
  matches,
  allMatches,
  players,
  decks,
  language,
  achievementUnlocks,
  header,
  onOpenDeck,
  renderFirstSecond,
  renderMatchups,
  renderDeckRow,
  renderHeadToHeadRow,
}: {
  player: Player
  matches: Match[]
  allMatches: Match[]
  players: Player[]
  decks: Deck[]
  language: Language
  achievementUnlocks: AchievementUnlock[]
  header: ReactNode
  onOpenDeck: (deckId: string) => void
  renderFirstSecond: (playerMatches: Match[]) => ReactNode
  renderMatchups: ReactNode
  renderDeckRow: (stat: RecordStat & { deckId: string; deckName: string }, deck: Deck | undefined) => ReactNode
  renderHeadToHeadRow: (stat: RecordStat & { opponentId: string }) => ReactNode
}) {
  const { t } = useI18n()
  const [panel, setPanel] = useState<ProfilePanel>(null)

  const playerMatches = getCompletedMatches(matches).filter(
    (m) => m.player1Id === player.id || m.player2Id === player.id,
  )
  const stat = buildPlayerStats(players, matches).find((item) => item.id === player.id) ?? null
  const streak = buildWinStreakStats(player.id, matches)
  const deckUsage = buildDeckUsageDistribution(player.id, decks, matches, language)
  const weeklyStats = buildWeeklyWinRateStats(player.id, allMatches)
  const globalRates = computeGlobalAchievementRates(players, decks, matches)
  const achievements = getPlayerAchievementProgress(
    player.id,
    players,
    decks,
    matches,
    achievementUnlocks,
    globalRates,
  )
  const peerRateMap = computePerPlayerAchievementRates(players, decks, matches)
  const peerRates: AchievementPeerRate[] = players
    .filter((p) => !p.archived && p.id !== player.id)
    .map((p) => ({
      playerId: p.id,
      name: p.name,
      rate: peerRateMap.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.rate - a.rate)
  const playerCompletionRate = computeAchievementSummary(achievements).tierRate
  const deckStats = buildPlayerDeckStats(players, decks, matches, language).filter(
    (item) => item.playerId === player.id,
  )
  const headToHead = buildHeadToHeadStats(player.id, players, matches)
  const recentMatches = [...playerMatches]
    .sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime())
    .slice(0, 12)
  const topDeck = deckStats[0]
  const topRival = headToHead[0]
  const achievementUnlocked = achievements.filter((a) => a.currentLevel > 0).length

  const close = () => setPanel(null)

  return (
    <div className="space-y-4">
      {header}

      <section className="space-y-2">
        <h2 className={uiSectionTitle}>{t('profile.hubSections')}</h2>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
          <ProfilePreviewCard
            title={t('profile.panel.overview')}
            value={formatPercent(getDisplayWinRate(stat?.winRate ?? null, stat?.total ?? 0))}
            detail={`${stat?.wins ?? 0}W-${stat?.losses ?? 0}L`}
            onClick={() => setPanel('overview')}
          />
          <ProfilePreviewCard
            title={t('profile.panel.trends')}
            value={streak.currentStreak > 0 ? `${streak.currentStreak}🔥` : `↑${streak.longestStreak}`}
            detail={t('profile.panel.trendsDetail')}
            onClick={() => setPanel('trends')}
          />
          <ProfilePreviewCard
            title={t('profile.panel.decks')}
            value={topDeck ? `${Math.round((topDeck.total / Math.max(stat?.total ?? 1, 1)) * 100)}%` : '—'}
            detail={topDeck?.deckName}
            onClick={() => setPanel('decks')}
          />
          <ProfilePreviewCard
            title={t('profile.panel.matches')}
            value={String(recentMatches.length)}
            detail={t('profile.panel.matchesDetail')}
            onClick={() => setPanel('matches')}
          />
          <ProfilePreviewCard
            title={t('profile.panel.achievements')}
            value={`${achievementUnlocked}/${achievements.length}`}
            detail={t('profile.panel.achievementsDetail')}
            onClick={() => setPanel('achievements')}
          />
          <ProfilePreviewCard
            title={t('profile.panel.rivals')}
            value={topRival?.name ?? '—'}
            detail={topRival ? `${topRival.wins}W-${topRival.losses}L` : undefined}
            onClick={() => setPanel('rivals')}
          />
        </div>
      </section>

      <AchievementsPreviewRail achievements={achievements} onOpenAll={() => setPanel('achievements')} />

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className={uiSectionTitle}>{t('stats.recentMatches')}</h2>
          <button type="button" className="text-xs font-semibold text-brand-400" onClick={() => setPanel('matches')}>
            {t('achievements.viewAll')}
          </button>
        </div>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
          {recentMatches.slice(0, 4).map((match) => (
            <div key={match.id} className="min-w-[17rem] shrink-0">
              <MatchListItem
                match={match}
                players={players}
                decks={decks}
                perspectivePlayerId={player.id}
                showTurnOrder
                showWinLossBadge
                showResultColors={false}
              />
            </div>
          ))}
        </div>
      </section>

      <PanelSheet open={panel === 'overview'} title={t('profile.panel.overview')} onClose={close}>
        <section className="grid grid-cols-3 gap-3">
          <article className={[uiCard, 'p-3 text-center'].join(' ')}>
            <p className="text-xs text-text-secondary">{t('stats.deckUsagePie')}</p>
            <p className="mt-1 text-2xl font-bold">
              {formatPercent(getDisplayWinRate(stat?.winRate ?? null, stat?.total ?? 0))}
            </p>
          </article>
          <article className={[uiCard, 'p-3 text-center'].join(' ')}>
            <p className="text-xs text-text-secondary">勝場</p>
            <p className="mt-1 text-2xl font-bold">{stat?.wins ?? 0}</p>
          </article>
          <article className={[uiCard, 'p-3 text-center'].join(' ')}>
            <p className="text-xs text-text-secondary">場數</p>
            <p className="mt-1 text-2xl font-bold">{stat?.total ?? 0}</p>
            <p className="text-[10px] text-text-secondary">{getSampleLabel(stat?.total ?? 0)}</p>
          </article>
        </section>
        <WinStreakSummary
          currentStreak={streak.currentStreak}
          longestStreak={streak.longestStreak}
          currentType={streak.currentType}
        />
        {renderFirstSecond(playerMatches)}
      </PanelSheet>

      <PanelSheet open={panel === 'trends'} title={t('profile.panel.trends')} onClose={close}>
        <WinStreakSummary
          currentStreak={streak.currentStreak}
          longestStreak={streak.longestStreak}
          currentType={streak.currentType}
        />
        <WeeklyWinRateChart stats={weeklyStats} title={t('stats.weeklyWinRate')} />
        <section className={[uiGlassCard, 'space-y-2 p-4'].join(' ')}>
          <h3 className="text-sm font-semibold">{t('profile.recentForm')}</h3>
          {buildRecentForm(matches, player.id).map((item) => (
            <div key={item.label} className="flex justify-between text-sm">
              <span className="text-text-secondary">{item.label}</span>
              <span className="font-semibold">
                {item.total ? `${item.wins}/${item.total}` : '—'}
                {item.winRate !== null ? ` · ${formatPercent(item.winRate)}` : ''}
              </span>
            </div>
          ))}
        </section>
      </PanelSheet>

      <PanelSheet open={panel === 'decks'} title={t('profile.panel.decks')} onClose={close}>
        <DeckUsagePieChart slices={deckUsage} title={t('stats.deckUsagePie')} />
        <section className="space-y-2">
          {deckStats.map((item) => (
            <button
              key={item.id}
              type="button"
              className="block w-full text-left"
              onClick={() => onOpenDeck(item.deckId)}
            >
              {renderDeckRow({ ...item, id: item.deckId, name: item.deckName }, decks.find((d) => d.id === item.deckId))}
            </button>
          ))}
        </section>
        {renderMatchups}
      </PanelSheet>

      <PanelSheet open={panel === 'matches'} title={t('profile.panel.matches')} onClose={close}>
        {recentMatches.length ? (
          recentMatches.map((match) => (
            <MatchListItem
              key={match.id}
              match={match}
              players={players}
              decks={decks}
              perspectivePlayerId={player.id}
              showTurnOrder
              showWinLossBadge
              showResultColors={false}
            />
          ))
        ) : (
          <p className="text-sm text-text-secondary">{t('stats.noRecentMatches')}</p>
        )}
      </PanelSheet>

      <PanelSheet open={panel === 'achievements'} title={t('profile.panel.achievements')} onClose={close}>
        <AchievementsWall
          achievements={achievements}
          playerCompletionRate={playerCompletionRate}
          peerRates={peerRates}
          peerContext={{
            players,
            decks,
            matches,
            achievementUnlocks,
            currentPlayerId: player.id,
          } satisfies AchievementPeerContext}
        />
      </PanelSheet>

      <PanelSheet open={panel === 'rivals'} title={t('profile.panel.rivals')} onClose={close}>
        {headToHead.length ? (
          headToHead.map((item) => <div key={item.id}>{renderHeadToHeadRow(item)}</div>)
        ) : (
          <p className="text-sm text-text-secondary">{t('stats.noHeadToHead')}</p>
        )}
      </PanelSheet>
    </div>
  )
}
