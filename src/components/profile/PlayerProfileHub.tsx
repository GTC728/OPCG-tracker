import { useMemo, useState, type ReactNode } from 'react'
import { AchievementsPreviewRail, AchievementsWall } from '@/components/achievements/AchievementsWall'
import { MatchRecordCard } from '@/components/match/MatchRecordCard'
import { WinLossRecord } from '@/components/match/WinLossRecord'
import { DeckPreviewCard } from '@/components/profile/DeckPreviewCard'
import { ProfileIdentityCard } from '@/components/profile/ProfileIdentityCard'
import { ProfilePreviewCard } from '@/components/profile/ProfilePreviewCard'
import { ProfileSection } from '@/components/profile/ProfileSection'
import { RecentMatchWinStrip } from '@/components/profile/RecentMatchWinStrip'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { RecentFormBars } from '@/components/profile/RecentFormBars'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { PagedList } from '@/components/ui/PagedList'
import { buildDeckUsageFillMap, DeckUsagePieChart } from '@/components/stats/DeckUsagePieChart'
import { WeeklyWinRateChart, WinStreakSummary } from '@/components/stats/PlayerTrendCharts'
import type { AchievementPeerContext } from '@/components/achievements/AchievementsWall'
import {
  useAchievementPanelData,
  useAchievementPreview,
  useAppDataSlice,
  usePlayerProfileBundle,
} from '@/hooks/useDerivedStats'
import { useI18n } from '@/lib/i18n'
import { formatPercent, type DeckUsageSlice, type PlayerDeckStat, type RecordStat } from '@/lib/stats'
import { getDisplayWinRate, getSampleLabel } from '@/lib/winRateDisplay'
import { formatDateTime } from '@/lib/utils'
import { uiCard } from '@/lib/uiSurface'
import { HorizontalRail } from '@/components/ui/HorizontalRail'
import type { AchievementUnlock, Deck, Language, Match, Player } from '@/types'
import { useAppStore } from '@/stores/appStore'

const PREVIEW_LIMIT = 10
const MATCH_PREVIEW_LIMIT = 3

type ProfilePanel = 'overview' | 'trends' | 'decks' | 'matches' | 'achievements' | 'rivals' | null

function PanelSheet({
  open,
  title,
  onClose,
  children,
  manageScroll = false,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  manageScroll?: boolean
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title} manageScroll={manageScroll}>
      <div className={manageScroll ? 'flex min-h-0 flex-1 flex-col' : 'space-y-4'}>{children}</div>
    </BottomSheet>
  )
}

function ProfileDeckRail({
  stats,
  decks,
  language,
  deckUsageById,
  deckUsageFillMap,
  onOpenDeck,
}: {
  stats: PlayerDeckStat[]
  decks: Deck[]
  language: Language
  deckUsageById: Map<string, DeckUsageSlice>
  deckUsageFillMap: Map<string, string>
  onOpenDeck: (deckId: string) => void
}) {
  const pieSlices = stats
    .map((item) => deckUsageById.get(item.deckId))
    .filter((slice): slice is DeckUsageSlice => Boolean(slice))

  return (
    <div className="flex items-center gap-2">
      {pieSlices.length ? (
        <div className="shrink-0">
          <DeckUsagePieChart slices={pieSlices} title="" inline />
        </div>
      ) : null}
      <HorizontalRail className="min-w-0 flex-1">
        {stats.map((item) => {
          const deck = decks.find((d) => d.id === item.deckId)
          if (!deck) return null
          const usage = deckUsageById.get(item.deckId)
          return (
            <DeckPreviewCard
              key={item.deckId}
              deck={deck}
              language={language}
              layout="rail"
              usagePercent={usage ? Math.round(usage.percentage * 1000) / 10 : 0}
              winRate={item.winRate}
              wins={item.wins}
              losses={item.losses}
              accentFill={deckUsageFillMap.get(item.deckId)}
              onClick={() => onOpenDeck(item.deckId)}
            />
          )
        })}
      </HorizontalRail>
    </div>
  )
}

export function PlayerProfileHub({
  player,
  allMatches,
  players,
  decks,
  language,
  achievementUnlocks,
  onBack,
  backLabel,
  onShare,
  onOpenDeck,
  renderFirstSecond,
  renderMatchups,
  renderDeckRow: _renderDeckRow,
  renderHeadToHeadRow,
}: {
  player: Player
  allMatches: Match[]
  players: Player[]
  decks: Deck[]
  language: Language
  achievementUnlocks: AchievementUnlock[]
  onBack: () => void
  backLabel?: string
  onShare?: () => void
  onOpenDeck: (deckId: string) => void
  renderFirstSecond: (playerMatches: Match[]) => ReactNode
  renderMatchups: ReactNode
  renderDeckRow: (stat: RecordStat & { deckId: string; deckName: string }, deck: Deck | undefined) => ReactNode
  renderHeadToHeadRow: (stat: RecordStat & { opponentId: string }) => ReactNode
}) {
  const { t } = useI18n()
  const linkedPlayerId = useAppStore((state) => state.settings.linkedPlayerId)
  const dataSlice = useAppDataSlice()
  const [panel, setPanel] = useState<ProfilePanel>(null)

  void allMatches
  void achievementUnlocks
  void _renderDeckRow

  const {
    playerMatches,
    stat,
    streak,
    deckUsage,
    deckUsageById,
    weeklyStats,
    deckStats,
    headToHead,
    recentForm,
    recentMatches,
    sessionCount,
  } = usePlayerProfileBundle(player.id, language)

  const previewAchievements = useAchievementPreview(player.id, linkedPlayerId)
  const achievementPanelData = useAchievementPanelData(
    player.id,
    panel === 'achievements',
    linkedPlayerId,
  )
  const deckUsageFillMap = useMemo(() => buildDeckUsageFillMap(deckUsage), [deckUsage])
  const sortedPlayerMatches = useMemo(
    () =>
      [...playerMatches].sort(
        (a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime(),
      ),
    [playerMatches],
  )

  const peerContext = useMemo(
    (): AchievementPeerContext => ({
      players,
      decks,
      matches: dataSlice.matches,
      achievementUnlocks: dataSlice.achievementUnlocks,
      currentPlayerId: player.id,
      linkedPlayerId,
      globalRates: achievementPanelData?.globalRates,
    }),
    [players, decks, dataSlice, player.id, linkedPlayerId, achievementPanelData?.globalRates],
  )

  const close = () => setPanel(null)

  return (
    <div className="space-y-5">
      <ProfileIdentityCard
        title={player.name}
        stat={stat}
        streak={streak}
        sessionCount={sessionCount}
        onBack={onBack}
        backLabel={backLabel}
        onShare={onShare}
        onViewDetails={() => setPanel('overview')}
      />

      <section className="space-y-2">
        <SectionHeader title={t('profile.recentForm')} />
        <div className="rounded-2xl border border-[var(--ui-border)] bg-surface-elevated px-3 py-3">
          <RecentMatchWinStrip matches={recentMatches} playerId={player.id} />
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader title={t('profile.panel.decks')} action={t('achievements.viewAll')} onAction={() => setPanel('decks')} />
        {deckStats.length ? (
          <ProfileDeckRail
            stats={deckStats.slice(0, PREVIEW_LIMIT)}
            decks={decks}
            language={language}
            deckUsageById={deckUsageById}
            deckUsageFillMap={deckUsageFillMap}
            onOpenDeck={onOpenDeck}
          />
        ) : (
          <p className="text-sm text-text-secondary">{t('stats.noDeckData')}</p>
        )}
      </section>

      <section className="space-y-2">
        <SectionHeader
          title={t('profile.panel.achievements')}
          action={t('achievements.viewAll')}
          onAction={() => setPanel('achievements')}
        />
        <AchievementsPreviewRail
          achievements={previewAchievements}
          variant="profile"
          previewLimit={PREVIEW_LIMIT}
          onOpenAll={() => setPanel('achievements')}
        />
      </section>

      <ProfileSection title={t('profile.panel.rivals')} onViewAll={() => setPanel('rivals')}>
        <HorizontalRail>
          {headToHead.length ? (
            headToHead.slice(0, PREVIEW_LIMIT).map((item) => (
              <ProfilePreviewCard
                key={item.opponentId}
                layout="avatar"
                label={item.name}
                value={<WinLossRecord wins={item.wins} losses={item.losses} />}
                detail={formatPercent(item.winRate)}
                onClick={() => setPanel('rivals')}
              />
            ))
          ) : (
            <p className="text-sm text-text-secondary">{t('stats.noHeadToHead')}</p>
          )}
        </HorizontalRail>
      </ProfileSection>

      <ProfileSection title={t('profile.panel.trendsChart')} onViewAll={() => setPanel('trends')}>
        {weeklyStats.some((item) => item.total > 0) ? (
          <WeeklyWinRateChart stats={weeklyStats} title={t('stats.weeklyWinRate')} compact />
        ) : (
          <p className="text-sm text-text-secondary">{t('stats.noRecentMatches')}</p>
        )}
      </ProfileSection>

      <ProfileSection title={t('stats.recentMatches')} onViewAll={() => setPanel('matches')}>
        {sortedPlayerMatches.length ? (
          <div className="space-y-2">
            {sortedPlayerMatches.slice(0, MATCH_PREVIEW_LIMIT).map((match) => (
              <MatchRecordCard
                key={match.id}
                match={match}
                players={players}
                decks={decks}
                perspectivePlayerId={player.id}
                timeLabel={formatDateTime(match.finishedAt).split(' ').slice(-1)[0]}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">{t('stats.noRecentMatches')}</p>
        )}
      </ProfileSection>

      <PanelSheet open={panel === 'overview'} title={t('profile.panel.overview')} onClose={close}>
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <article className={[uiCard, 'p-3 text-center'].join(' ')}>
            <p className="text-xs text-text-secondary">{t('stats.sessionCount')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{sessionCount}</p>
          </article>
          <article className={[uiCard, 'p-3 text-center'].join(' ')}>
            <p className="text-xs text-text-secondary">{t('stats.record')}</p>
            <p className="mt-1 text-2xl font-bold">
              <WinLossRecord wins={stat?.wins ?? 0} losses={stat?.losses ?? 0} />
            </p>
          </article>
          <article className={[uiCard, 'p-3 text-center'].join(' ')}>
            <p className="text-xs text-text-secondary">{t('stats.winRate')}</p>
            <p className="mt-1 text-2xl font-bold">
              {formatPercent(getDisplayWinRate(stat?.wins ?? 0, stat?.total ?? 0))}
            </p>
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
        {renderMatchups}
      </PanelSheet>

      <PanelSheet open={panel === 'trends'} title={t('profile.panel.trends')} onClose={close}>
        <RecentFormBars recentForm={recentForm} />
        <WeeklyWinRateChart stats={weeklyStats} title={t('stats.weeklyWinRate')} />
      </PanelSheet>

      <PanelSheet open={panel === 'decks'} title={t('profile.panel.decks')} onClose={close}>
        {deckStats.length ? (
          <ProfileDeckRail
            stats={deckStats}
            decks={decks}
            language={language}
            deckUsageById={deckUsageById}
            deckUsageFillMap={deckUsageFillMap}
            onOpenDeck={onOpenDeck}
          />
        ) : (
          <p className="text-sm text-text-secondary">{t('stats.noDeckData')}</p>
        )}
      </PanelSheet>

      <PanelSheet open={panel === 'matches'} title={t('profile.panel.matches')} onClose={close} manageScroll>
        <PagedList
          items={sortedPlayerMatches}
          renderItem={(match) => (
            <MatchRecordCard
              match={match}
              players={players}
              decks={decks}
              perspectivePlayerId={player.id}
              timeLabel={formatDateTime(match.finishedAt)}
            />
          )}
          getItemKey={(match) => match.id}
          empty={<p className="text-sm text-text-secondary">{t('stats.noRecentMatches')}</p>}
        />
      </PanelSheet>

      <PanelSheet open={panel === 'achievements'} title={t('profile.panel.achievements')} onClose={close}>
        {achievementPanelData ? (
          <AchievementsWall
            achievements={achievementPanelData.achievements}
            playerCompletionRate={achievementPanelData.summary.tierRate}
            peerRates={achievementPanelData.peerRates}
            peerContext={peerContext}
          />
        ) : null}
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
