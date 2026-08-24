import { useMemo, useState } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { MatchSummaryCard } from '@/components/match/MatchSummaryCard'
import { MatchRecorder } from '@/components/record/MatchRecorder'
import { SessionDashboardShareCard, ShareExportSheet } from '@/components/share/ShareExportSheet'
import { SessionManager } from '@/components/session/SessionManager'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useSessionDashboard } from '@/hooks/useDerivedStats'
import { useI18n } from '@/lib/i18n'
import { formatPercent } from '@/lib/stats'
import { getDisplayWinRate } from '@/lib/winRateDisplay'
import { GroupedListRow, GroupedListSection } from '@/components/ui/GroupedList'
import { MetricHeroCard } from '@/components/ui/MetricHeroCard'
import { PageHero } from '@/components/ui/PageHero'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { uiCard } from '@/lib/uiSurface'
import { formatDateTime } from '@/lib/utils'
import { canRecordMatchesEffective } from '@/lib/groupPermissions'
import { useAppStore } from '@/stores/appStore'
import type { Match } from '@/types'

function recentSessionMatches(matches: Match[], sessionId: string, limit = 4): Match[] {
  return matches
    .filter((match) => match.sessionId === sessionId && match.finishedAt)
    .sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime())
    .slice(0, limit)
}

export function RecordPage() {
  const { t, language } = useI18n()
  const toast = useToast()
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const sessions = useAppStore((s) => s.sessions)
  const currentSessionId = useAppStore((s) => s.currentSessionId)
  const players = useAppStore((s) => s.players)
  const decks = useAppStore((s) => s.decks)
  const matches = useAppStore((s) => s.matches)
  const activeMatches = useAppStore((s) => s.activeMatches)
  const groupMemberRole = useAppStore((s) => s.settings.groupMemberRole)
  const groupMemberBannedAt = useAppStore((s) => s.settings.groupMemberBannedAt)
  const inGroup = useAppStore((s) => s.settings.lastGroupCode)
  const readOnly = Boolean(inGroup) && !canRecordMatchesEffective(groupMemberRole, groupMemberBannedAt)
  const endCurrentSession = useAppStore((s) => s.endCurrentSession)
  const createNewSession = useAppStore((s) => s.createNewSession)
  const openSessionRosterPrompt = useAppStore((s) => s.openSessionRosterPrompt)
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false)
  const [sessionManageOpen, setSessionManageOpen] = useState(false)
  const [sessionShareOpen, setSessionShareOpen] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const currentSession = sessions.find((session) => session.id === currentSessionId)
  const sessionActiveMatches = activeMatches.filter((match) => match.sessionId === currentSessionId)
  const dashboard = useSessionDashboard(currentSessionId ?? null, language)
  const recentMatches = useMemo(
    () => (currentSessionId ? recentSessionMatches(matches, currentSessionId) : []),
    [matches, currentSessionId],
  )

  const openSessionManage = () => {
    if (currentSession) {
      setSessionManageOpen(true)
      return
    }
    setSessionSheetOpen(true)
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3">
        {currentSession ? (
          <>
            <PageHero
              eyebrow={t('record.active')}
              title={currentSession.name}
              subtitle={
                dashboard
                  ? `${dashboard.totalMatches}${t('stats.matchesUnit')} · ${sessionActiveMatches.length}進行${
                      dashboard.topPlayer ? ` · MVP ${dashboard.topPlayer.name}` : ''
                    }`
                  : undefined
              }
            />
            {(() => {
              if (!dashboard) return null
              const heroMetrics = [
                ...(dashboard.firstPlayerSample > 0
                  ? [{ label: t('stats.firstWinRate'), value: formatPercent(dashboard.firstPlayerWinRate) }]
                  : []),
                ...(dashboard.topPlayer
                  ? [
                      {
                        label: t('stats.mvp'),
                        value: formatPercent(
                          getDisplayWinRate(dashboard.topPlayer.wins, dashboard.topPlayer.total),
                        ),
                        accent: true,
                      },
                    ]
                  : []),
              ]
              if (!heroMetrics.length) return null
              return heroMetrics.length === 2 ? (
                <MetricHeroCard split metrics={heroMetrics} />
              ) : (
                <MetricHeroCard metrics={heroMetrics} />
              )
            })()}
          </>
        ) : (
          <>
            <PageHero eyebrow={t('record.currentSession')} title={t('settings.noActiveSession')} />
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="min-h-10 text-xs"
                onClick={() => {
                  createNewSession()
                  toast.success(t('record.sessionStarted'))
                }}
              >
                {t('record.newSession')}
              </Button>
              <Button variant="secondary" className="min-h-10 text-xs" onClick={() => setSessionSheetOpen(true)}>
                {t('record.manageSession')}
              </Button>
            </div>
          </>
        )}
      </section>

      {readOnly ? (
        <section className={[uiCard, 'p-4 text-sm text-text-secondary'].join(' ')}>
          <p className="font-semibold text-text-primary">觀眾模式</p>
          <p className="mt-1">你在此群組為觀眾，可查看對局與統計，無法錄製或刪除對局。</p>
        </section>
      ) : (
        <section className="space-y-3">
          <SectionHeader title={t('record.tableSection')} action={t('lobby.manage')} onAction={openSessionManage} />
          <MatchRecorder />
        </section>
      )}

      {currentSession && recentMatches.length ? (
        <section className="space-y-2">
          <SectionHeader title={t('record.recentMatches')} />
          <div className="space-y-2">
            {recentMatches.map((match) => (
              <MatchSummaryCard key={match.id} match={match} players={players} decks={decks} />
            ))}
          </div>
        </section>
      ) : null}

      <BottomSheet
        open={sessionManageOpen}
        onClose={() => setSessionManageOpen(false)}
        title={t('record.manageSession')}
      >
        {currentSession ? (
          <div className="space-y-4">
            {dashboard ? (
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-surface px-2 py-1.5">
                  <dt className="text-text-secondary">{t('record.start')}</dt>
                  <dd className="font-semibold">{formatDateTime(currentSession.startedAt)}</dd>
                </div>
                <div className="rounded-lg bg-surface px-2 py-1.5">
                  <dt className="text-text-secondary">{t('record.completedActive')}</dt>
                  <dd className="font-semibold">
                    {dashboard.totalMatches} / {sessionActiveMatches.length}
                  </dd>
                </div>
                <div className="rounded-lg bg-surface px-2 py-1.5">
                  <dt className="text-text-secondary">{t('record.mvp')}</dt>
                  <dd className="font-semibold">
                    {dashboard.topPlayer ? (
                      <>
                        <span className="block truncate">{dashboard.topPlayer.name}</span>
                        <span className="mt-0.5 block text-[10px] font-normal text-text-secondary">
                          {formatPercent(dashboard.topPlayer.winRate)} · {dashboard.topPlayer.wins}W
                          {dashboard.topPlayer.losses}L
                        </span>
                      </>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="rounded-lg bg-surface px-2 py-1.5">
                  <dt className="text-text-secondary">{t('record.topDeck')}</dt>
                  <dd className="font-semibold">
                    {dashboard.topDeck ? (
                      <span className="block min-w-0 truncate">
                        <DeckLabel deck={decks.find((deck) => deck.id === dashboard.topDeck?.id)} showCode />
                        <span className="mt-0.5 block text-[10px] font-normal text-text-secondary">
                          {formatPercent(dashboard.topDeck.winRate)} · {dashboard.topDeck.wins}W
                          {dashboard.topDeck.losses}L
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </dl>
            ) : null}

            <GroupedListSection>
              <GroupedListRow
                title={t('record.players')}
                onClick={() => {
                  setSessionManageOpen(false)
                  openSessionRosterPrompt(currentSession.id)
                }}
              />
              <GroupedListRow
                title={t('record.manageSession')}
                onClick={() => {
                  setSessionManageOpen(false)
                  setSessionSheetOpen(true)
                }}
              />
              <GroupedListRow
                title={t('record.exportSession')}
                onClick={() => {
                  setSessionManageOpen(false)
                  setSessionShareOpen(true)
                }}
              />
              <GroupedListRow
                title={t('session.exportExcel')}
                onClick={() => {
                  if (exportingExcel) return
                  void (async () => {
                    setExportingExcel(true)
                    try {
                      const { exportSessionExcel } = await import('@/lib/excelExport')
                      const { getAppState } = await import('@/stores/appStore')
                      await exportSessionExcel(getAppState(), currentSession.id)
                      toast.success(t('session.exportExcelSuccess'))
                    } catch (caught) {
                      toast.error(caught instanceof Error ? caught.message : t('session.exportExcelFailed'))
                    } finally {
                      setExportingExcel(false)
                    }
                  })()
                }}
              />
              <GroupedListRow
                title={t('record.end')}
                onClick={() => {
                  endCurrentSession()
                  setSessionManageOpen(false)
                  toast.success(t('record.sessionEnded'))
                }}
              />
            </GroupedListSection>
          </div>
        ) : null}
      </BottomSheet>

      <SessionManager
        compact
        open={sessionSheetOpen}
        onClose={() => setSessionSheetOpen(false)}
        onBackup={() => {
          setSessionSheetOpen(false)
          setActiveTab('settings')
        }}
      />

      {currentSession ? (
        <ShareExportSheet
          open={sessionShareOpen}
          onClose={() => setSessionShareOpen(false)}
          title={currentSession.name}
          filename={`opcg-session-${currentSession.name}.png`}
        >
          <SessionDashboardShareCard
            session={currentSession}
            players={players}
            decks={decks}
            matches={matches}
            language={language}
          />
        </ShareExportSheet>
      ) : null}
    </div>
  )
}
