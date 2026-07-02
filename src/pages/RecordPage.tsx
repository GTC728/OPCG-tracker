import { MatchRecorder } from '@/components/record/MatchRecorder'
import { Button } from '@/components/ui/Button'
import { buildDashboardStats, formatPercent } from '@/lib/stats'
import { formatDateTime } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'

export function RecordPage() {
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
              Current Session
            </p>
            {currentSession ? (
              <>
                <h2 className="mt-2 text-xl font-bold">{currentSession.name}</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  開始：{formatDateTime(currentSession.startedAt)}
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
            onClick={endCurrentSession}
          >
            結束
          </Button>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-text-secondary">完成 / 進行中</dt>
            <dd className="mt-1 text-xl font-bold">
              {dashboard.totalMatches} / {sessionActiveMatches.length}
            </dd>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-text-secondary">先攻勝率</dt>
            <dd className="mt-1 text-xl font-bold">{formatPercent(dashboard.firstPlayerWinRate)}</dd>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-text-secondary">今日 MVP</dt>
            <dd className="mt-1 truncate text-xl font-bold">{dashboard.topPlayer?.name ?? '—'}</dd>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-text-secondary">常用 Deck</dt>
            <dd className="mt-1 truncate text-xl font-bold">{dashboard.mostUsedDeck?.name ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <MatchRecorder />
    </div>
  )
}
