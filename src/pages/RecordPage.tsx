import { useState } from 'react'
import { DeckLabel } from '@/components/deck/DeckLabel'
import { MatchRecorder } from '@/components/record/MatchRecorder'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/lib/i18n'
import { buildDashboardStats, formatPercent } from '@/lib/stats'
import { formatDateTime } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'

export function RecordPage() {
  const { t, language } = useI18n()
  const toast = useToast()
  const sessions = useAppStore((s) => s.sessions)
  const currentSessionId = useAppStore((s) => s.currentSessionId)
  const players = useAppStore((s) => s.players)
  const decks = useAppStore((s) => s.decks)
  const matches = useAppStore((s) => s.matches)
  const activeMatches = useAppStore((s) => s.activeMatches)
  const endCurrentSession = useAppStore((s) => s.endCurrentSession)
  const createNewSession = useAppStore((s) => s.createNewSession)
  const openSessionRosterPrompt = useAppStore((s) => s.openSessionRosterPrompt)
  const [expanded, setExpanded] = useState(false)
  const currentSession = sessions.find((session) => session.id === currentSessionId)
  const sessionMatches = matches.filter((match) => match.sessionId === currentSessionId)
  const sessionActiveMatches = activeMatches.filter((match) => match.sessionId === currentSessionId)
  const dashboard = buildDashboardStats(players, decks, sessionMatches, language)

  return (
    <div className="space-y-3">
      <section className="rounded-xl bg-surface-elevated px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-500">
            {t('record.currentSession')}
          </p>
          {currentSession ? (
            <p className="mt-0.5 text-sm font-semibold leading-snug">
              {currentSession.name}
              <span className="mt-0.5 block text-xs font-normal text-text-secondary">
                {dashboard.totalMatches}完成 / {sessionActiveMatches.length}進行
                {dashboard.firstPlayerSample > 0
                  ? ` · 先攻${formatPercent(dashboard.firstPlayerWinRate)}`
                  : ''}
                {dashboard.topPlayer ? ` · MVP ${dashboard.topPlayer.name}` : ''}
              </span>
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-text-secondary">{t('settings.noActiveSession')}</p>
          )}
        </div>

        {currentSession ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              className="min-h-10 text-xs"
              onClick={() => openSessionRosterPrompt(currentSession.id)}
            >
              {t('record.players')}
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
        ) : (
          <Button
            className="mt-2 min-h-10 w-full text-xs"
            onClick={() => {
              createNewSession()
              toast.success(t('record.sessionStarted'))
            }}
          >
            {t('record.newSession')}
          </Button>
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

        {expanded && currentSession ? (
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
              <dd className="truncate font-semibold">{dashboard.topPlayer?.name ?? '—'}</dd>
            </div>
            <div className="rounded-lg bg-surface px-2 py-1.5">
              <dt className="text-text-secondary">{t('record.usedDeck')}</dt>
              <dd className="truncate font-semibold">
                {dashboard.mostUsedDeck ? (
                  <DeckLabel
                    deck={decks.find((deck) => deck.id === dashboard.mostUsedDeck?.id)}
                    showCode
                  />
                ) : (
                  '—'
                )}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>

      <MatchRecorder />
    </div>
  )
}
