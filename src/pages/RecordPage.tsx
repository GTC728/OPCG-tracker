import { MatchRecorder } from '@/components/record/MatchRecorder'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/lib/i18n'
import { buildDashboardStats, formatPercent } from '@/lib/stats'
import { formatDateTime } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'

export function RecordPage() {
  const { t } = useI18n()
  const toast = useToast()
  const sessions = useAppStore((s) => s.sessions)
  const currentSessionId = useAppStore((s) => s.currentSessionId)
  const players = useAppStore((s) => s.players)
  const decks = useAppStore((s) => s.decks)
  const matches = useAppStore((s) => s.matches)
  const activeMatches = useAppStore((s) => s.activeMatches)
  const endCurrentSession = useAppStore((s) => s.endCurrentSession)
  const currentSession = sessions.find((session) => session.id === currentSessionId)
  const sessionMatches = matches.filter((match) => match.sessionId === currentSessionId)
  const sessionActiveMatches = activeMatches.filter((match) => match.sessionId === currentSessionId)
  const dashboard = buildDashboardStats(players, decks, sessionMatches)

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-surface-elevated p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
              {t('record.currentSession')}
            </p>
            {currentSession ? (
              <>
                <h2 className="mt-2 text-xl font-bold">{currentSession.name}</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {t('record.start')}：{formatDateTime(currentSession.startedAt)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-text-secondary">未有進行中的 session</p>
            )}
          </div>
          <Button
            variant="ghost"
            className="min-h-10 shrink-0 py-2 text-sm"
            disabled={!currentSession}
            onClick={() => {
              endCurrentSession()
              toast.success('Session 已結束')
            }}
          >
            {t('record.end')}
          </Button>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-text-secondary">{t('record.completedActive')}</dt>
            <dd className="mt-1 text-xl font-bold">
              {dashboard.totalMatches} / {sessionActiveMatches.length}
            </dd>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-text-secondary">{t('record.firstWinRate')}</dt>
            <dd className="mt-1 text-xl font-bold">{formatPercent(dashboard.firstPlayerWinRate)}</dd>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-text-secondary">{t('record.mvp')}</dt>
            <dd className="mt-1 truncate text-xl font-bold">{dashboard.topPlayer?.name ?? '—'}</dd>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-text-secondary">{t('record.usedDeck')}</dt>
            <dd className="mt-1 truncate text-xl font-bold">{dashboard.mostUsedDeck?.name ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <MatchRecorder />
    </div>
  )
}
