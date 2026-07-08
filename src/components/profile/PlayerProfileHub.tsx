import { useState, type ReactNode } from 'react'
import { AchievementsPreviewRail, AchievementsWall } from '@/components/achievements/AchievementsWall'
import { MatchListItem } from '@/components/match/MatchResultRow'
import { DeckPreviewCard } from '@/components/profile/DeckPreviewCard'
import { ProfileIdentityCard } from '@/components/profile/ProfileIdentityCard'
import { ProfilePreviewCard } from '@/components/profile/ProfilePreviewCard'
import { ProfileSection } from '@/components/profile/ProfileSection'
import { RecentFormBars } from '@/components/profile/RecentFormBars'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { DeckUsagePieChart } from '@/components/stats/DeckUsagePieChart'
import { WeeklyWinRateChart, WinStreakSummary } from '@/components/stats/PlayerTrendCharts'
import {
  computeGlobalAchievementRates,
  computePerPlayerAchievementRates,
  computeAchievementSummary,
  getPlayerAchievementProgress,
  backlogExtrasFromState,
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
import { uiCard, uiHorizontalRail } from '@/lib/uiSurface'
import type { AchievementUnlock, Deck, Language, Match, Player } from '@/types'
import { useAppStore } from '@/stores/appStore'

const PREVIEW_LIMIT = 10

type ProfilePanel = 'overview' | 'trends' | 'decks' | 'matches' | 'achievements' | 'rivals' | null

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
  allMatches,
  players,
  decks,
  language,
  achievementUnlocks,
  onBack,
  onShare,
  onOpenDeck,
  renderFirstSecond,
  renderMatchups,
  renderDeckRow,
  renderHeadToHeadRow,
}: {
  player: Player
  allMatches: Match[]
  players: Player[]
  decks: Deck[]
  language: Language
  achievementUnlocks: AchievementUnlock[]
  onBack: () => void
  onShare?: () => void
  onOpenDeck: (deckId: string) => void
  renderFirstSecond: (playerMatches: Match[]) => ReactNode
  renderMatchups: ReactNode
  renderDeckRow: (stat: RecordStat & { deckId: string; deckName: string }, deck: Deck | undefined) => ReactNode
  renderHeadToHeadRow: (stat: RecordStat & { opponentId: string }) => ReactNode
}) {
  const { t } = useI18n()
  const appState = useAppStore()
  const linkedPlayerId = appState.settings.linkedPlayerId
  const backlogExtras = backlogExtrasFromState(appState)
  const [panel, setPanel] = useState<ProfilePanel>(null)

  const lifetimeMatches = allMatches
  const playerMatches = getCompletedMatches(lifetimeMatches).filter(
    (m) => m.player1Id === player.id || m.player2Id === player.id,
  )
  const stat = buildPlayerStats(players, lifetimeMatches).find((item) => item.id === player.id) ?? null
  const streak = buildWinStreakStats(player.id, lifetimeMatches)
  const deckUsage = buildDeckUsageDistribution(player.id, decks, lifetimeMatches, language)
  const deckUsageById = new Map(deckUsage.map((slice) => [slice.deckId, slice]))
  const weeklyStats = buildWeeklyWinRateStats(player.id, lifetimeMatches)
  const globalRates = computeGlobalAchievementRates(players, decks, lifetimeMatches)
  const achievements = getPlayerAchievementProgress(
    player.id,
    players,
    decks,
    lifetimeMatches,
    achievementUnlocks,
    globalRates,
    linkedPlayerId,
    backlogExtras,
  )
  const peerRateMap = computePerPlayerAchievementRates(players, decks, lifetimeMatches)
  const peerRates: AchievementPeerRate[] = players
    .filter((p) => !p.archived && p.id !== player.id)
    .map((p) => ({
      playerId: p.id,
      name: p.name,
      rate: peerRateMap.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.rate - a.rate)
  const achievementSummary = computeAchievementSummary(achievements)
  const playerCompletionRate = achievementSummary.tierRate
  const deckStats = buildPlayerDeckStats(players, decks, lifetimeMatches, language).filter(
    (item) => item.playerId === player.id,
  )
  const headToHead = buildHeadToHeadStats(player.id, players, lifetimeMatches)
  const recentForm = buildRecentForm(lifetimeMatches, player.id)
  const recentMatches = [...playerMatches]
    .sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime())
    .slice(0, PREVIEW_LIMIT)

  const close = () => setPanel(null)

  return (
    <div className="space-y-5">
      <ProfileIdentityCard
        title={player.name}
        stat={stat}
        streak={streak}
        recentForm={recentForm}
        onBack={onBack}
        onShare={onShare}
        onViewDetails={() => setPanel('overview')}
      />

      <AchievementsPreviewRail
        achievements={achievements}
        variant="profile"
        previewLimit={PREVIEW_LIMIT}
        onOpenAll={() => setPanel('achievements')}
      />

      <ProfileSection title={t('profile.panel.decks')} onViewAll={() => setPanel('decks')}>
        <div className={uiHorizontalRail}>
          {deckStats.length ? (
            deckStats.slice(0, PREVIEW_LIMIT).map((item) => {
              const deck = decks.find((d) => d.id === item.deckId)
              if (!deck) return null
              const usage = deckUsageById.get(item.deckId)
              return (
                <DeckPreviewCard
                  key={item.deckId}
                  deck={deck}
                  usagePercent={usage ? Math.round(usage.percentage * 1000) / 10 : 0}
                  winRate={item.winRate}
                  record={`${item.wins}W-${item.losses}L`}
                  onClick={() => onOpenDeck(item.deckId)}
                />
              )
            })
          ) : (
            <p className="text-sm text-text-secondary">{t('stats.noDeckData')}</p>
          )}
        </div>
      </ProfileSection>

      <ProfileSection title={t('profile.panel.rivals')} onViewAll={() => setPanel('rivals')}>
        <div className={uiHorizontalRail}>
          {headToHead.length ? (
            headToHead.slice(0, PREVIEW_LIMIT).map((item) => (
              <ProfilePreviewCard
                key={item.opponentId}
                label={item.name}
                value={`${item.wins}W-${item.losses}L`}
                detail={formatPercent(item.winRate)}
                onClick={() => setPanel('rivals')}
              />
            ))
          ) : (
            <p className="text-sm text-text-secondary">{t('stats.noHeadToHead')}</p>
          )}
        </div>
      </ProfileSection>

      <ProfileSection title={t('profile.panel.trends')} onViewAll={() => setPanel('trends')}>
        <RecentFormBars recentForm={recentForm} />
      </ProfileSection>

      <ProfileSection title={t('stats.recentMatches')} onViewAll={() => setPanel('matches')}>
        <div className={uiHorizontalRail}>
          {recentMatches.map((match) => (
            <div key={match.id} className="w-[16rem] shrink-0 snap-start">
              <MatchListItem
                match={match}
                players={players}
                decks={decks}
                perspectivePlayerId={player.id}
                showTurnOrder
                showWinLossBadge
                showResultColors={false}
                showDuration
              />
            </div>
          ))}
        </div>
      </ProfileSection>

      <PanelSheet open={panel === 'overview'} title={t('profile.panel.overview')} onClose={close}>
        <section className="grid grid-cols-3 gap-3">
          <article className={[uiCard, 'p-3 text-center'].join(' ')}>
            <p className="text-xs text-text-secondary">{t('stats.winRate')}</p>
            <p className="mt-1 text-2xl font-bold">
              {formatPercent(getDisplayWinRate(stat?.winRate ?? null, stat?.total ?? 0))}
            </p>
          </article>
          <article className={[uiCard, 'p-3 text-center'].join(' ')}>
            <p className="text-xs text-text-secondary">{t('stats.wins')}</p>
            <p className="mt-1 text-2xl font-bold">{stat?.wins ?? 0}</p>
          </article>
          <article className={[uiCard, 'p-3 text-center'].join(' ')}>
            <p className="text-xs text-text-secondary">{t('stats.matchesUnit')}</p>
            <p className="mt-1 text-2xl font-bold">{stat?.total ?? 0}</p>
            <p className="text-[10px] text-text-secondary">{getSampleLabel(stat?.total ?? 0)}</p>
          </article>
        </section>
        <WinStreakSummary
          currentStreak={streak.currentStreak}
          longestStreak={streak.longestStreak}
          currentLossStreak={streak.currentLossStreak}
          currentType={streak.currentType}
        />
        {renderFirstSecond(playerMatches)}
      </PanelSheet>

      <PanelSheet open={panel === 'trends'} title={t('profile.panel.trends')} onClose={close}>
        <RecentFormBars recentForm={recentForm} />
        <WeeklyWinRateChart stats={weeklyStats} title={t('stats.weeklyWinRate')} />
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
        {playerMatches.length ? (
          playerMatches.map((match) => (
            <MatchListItem
              key={match.id}
              match={match}
              players={players}
              decks={decks}
              perspectivePlayerId={player.id}
              showTurnOrder
              showWinLossBadge
              showResultColors={false}
              showDuration
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
            matches: lifetimeMatches,
            achievementUnlocks,
            currentPlayerId: player.id,
            linkedPlayerId,
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
