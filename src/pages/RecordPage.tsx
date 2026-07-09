import { useState } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { MatchRecorder } from '@/components/record/MatchRecorder'
import { SessionDashboardShareCard, ShareExportSheet } from '@/components/share/ShareExportSheet'
import { SessionManager } from '@/components/session/SessionManager'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useSessionDashboard } from '@/hooks/useDerivedStats'
import { useI18n } from '@/lib/i18n'
import { formatPercent } from '@/lib/stats'
import { uiCard } from '@/lib/uiSurface'
import { formatDateTime } from '@/lib/utils'
import { isReadOnlyMember } from '@/lib/groupPermissions'
import { useAppStore } from '@/stores/appStore'

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
  const inGroup = useAppStore((s) => s.settings.lastGroupCode)
  const readOnly = inGroup && isReadOnlyMember(groupMemberRole)
  const endCurrentSession = useAppStore((s) => s.endCurrentSession)
  const createNewSession = useAppStore((s) => s.createNewSession)
  const openSessionRosterPrompt = useAppStore((s) => s.openSessionRosterPrompt)
  const [expanded, setExpanded] = useState(false)
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false)
  const [sessionShareOpen, setSessionShareOpen] = useState(false)
  const currentSession = sessions.find((session) => session.id === currentSessionId)
  const sessionActiveMatches = activeMatches.filter((match) => match.sessionId === currentSessionId)
  const dashboard = useSessionDashboard(currentSessionId ?? null, language)

  return (
    <div className="space-y-3">
      <section className={[uiCard, 'px-3 py-2.5'].join(' ')}>
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-secondary">{t('record.currentSession')}</p>
          {currentSession ? (
            <p className="mt-0.5 text-sm font-semibold leading-snug">
              {currentSession.name}
              {dashboard ? (
                <span className="mt-0.5 block text-xs font-normal text-text-secondary">
                  {dashboard.totalMatches}完成 / {sessionActiveMatches.length}進行
                  {dashboard.firstPlayerSample > 0
                    ? ` · 先攻${formatPercent(dashboard.firstPlayerWinRate)}`
                    : ''}
                  {dashboard.topPlayer ? ` · MVP ${dashboard.topPlayer.name}` : ''}
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-text-secondary">{t('settings.noActiveSession')}</p>
          )}
        </div>

        {currentSession ? (
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="secondary"
                className="min-h-10 text-xs"
                onClick={() => openSessionRosterPrompt(currentSession.id)}
              >
                {t('record.players')}
              </Button>
              <Button
                variant="secondary"
                className="min-h-10 text-xs"
                onClick={() => setSessionSheetOpen(true)}
              >
                {t('record.manageSession')}
              </Button>
              <Button
                variant="ghost"
                className="min-h-10 text-xs"
                onClick={() => {
                  endCurrentSession()
                  toast.success(t('record.sessionEnded'))
                }}
              >
                {t('record.end')}
              </Button>
            </div>
            <Button
              variant="secondary"
              className="min-h-10 w-full text-xs"
              onClick={() => setSessionShareOpen(true)}
            >
              {t('record.exportSession')}
            </Button>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              className="min-h-10 text-xs"
              onClick={() => {
                createNewSession()
                toast.success(t('record.sessionStarted'))
              }}
            >
              {t('record.newSession')}
            </Button>
            <Button
              variant="secondary"
              className="min-h-10 text-xs"
              onClick={() => setSessionSheetOpen(true)}
            >
              {t('record.manageSession')}
            </Button>
          </div>
        )}

        {currentSession ? (
          <button
            type="button"
            className="mt-2 w-full text-center text-[11px] text-brand-400 outline-none"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? '收起詳情 ▲' : '展開詳情 ▼'}
          </button>
        ) : null}

        {expanded && currentSession && dashboard ? (
          <dl className="mt-2 grid grid-cols-2 gap-2 border-t border-surface-muted pt-2 text-xs">
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
                    <DeckLabel
                      deck={decks.find((deck) => deck.id === dashboard.topDeck?.id)}
                      showCode
                    />
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
      </section>

      {readOnly ? (
        <section className={[uiCard, 'p-4 text-sm text-text-secondary'].join(' ')}>
          <p className="font-semibold text-text-primary">觀眾模式</p>
          <p className="mt-1">你在此群組為觀眾，可查看對局與統計，無法錄製或刪除對局。</p>
        </section>
      ) : (
        <MatchRecorder />
      )}

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
