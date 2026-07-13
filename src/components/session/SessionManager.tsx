import { useEffect, useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { PermanentDeletePrompt } from '@/components/ui/PermanentDeletePrompt'
import { useToast } from '@/components/ui/Toast'
import {
  activeListedSessions,
  archivedSessions,
  countSessionMatches,
} from '@/lib/entityVisibility'
import { useI18n } from '@/lib/i18n'
import { formatDateTime } from '@/lib/utils'
import { SessionMergeTool } from '@/components/session/SessionMergeTool'
import { useAppStore } from '@/stores/appStore'
import type { Session } from '@/types'

function SessionRow({
  session,
  currentSessionId,
  matchCount,
  onSwitch,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  session: Session
  currentSessionId: string | null
  matchCount: number
  onSwitch: () => void
  onArchive?: () => void
  onUnarchive?: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()

  return (
    <div
      className={[
        'rounded-xl p-3 ring-1 ring-surface-muted',
        session.id === currentSessionId ? 'bg-brand-600 text-white' : 'bg-surface',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-w-0 flex-1 text-left outline-none" onClick={onSwitch}>
          <span className="block font-semibold">{session.name}</span>
          <span className="mt-1 block text-xs opacity-75">{formatDateTime(session.startedAt)}</span>
          <span className="mt-1 block text-xs opacity-75">
            {matchCount} {t('session.matchCount')}
          </span>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-xs opacity-75">
            {session.id === currentSessionId
              ? t('settings.currentLabel')
              : session.endedAt
                ? t('settings.endedLabel')
                : t('settings.openLabel')}
          </span>
          {onArchive ? (
            <button type="button" className="text-xs underline opacity-80 outline-none" onClick={onArchive}>
              {t('session.archive')}
            </button>
          ) : null}
          {onUnarchive ? (
            <button type="button" className="text-xs underline opacity-80 outline-none" onClick={onUnarchive}>
              {t('session.unarchive')}
            </button>
          ) : null}
          <button
            type="button"
            className="text-xs text-red-200 underline outline-none"
            onClick={onDelete}
          >
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function SessionManager({
  open,
  onClose,
  onBackup,
  compact = false,
}: {
  open?: boolean
  onClose?: () => void
  onBackup?: () => void
  compact?: boolean
}) {
  const { t } = useI18n()
  const toast = useToast()
  const sessions = useAppStore((s) => s.sessions)
  const matches = useAppStore((s) => s.matches)
  const activeMatches = useAppStore((s) => s.activeMatches)
  const currentSessionId = useAppStore((s) => s.currentSessionId)
  const createNewSession = useAppStore((s) => s.createNewSession)
  const updateSessionName = useAppStore((s) => s.updateSessionName)
  const switchSession = useAppStore((s) => s.switchSession)
  const endCurrentSession = useAppStore((s) => s.endCurrentSession)
  const archiveSession = useAppStore((s) => s.archiveSession)
  const unarchiveSession = useAppStore((s) => s.unarchiveSession)
  const deleteSession = useAppStore((s) => s.deleteSession)
  const mergeSessions = useAppStore((s) => s.mergeSessions)
  const currentSession = sessions.find((session) => session.id === currentSessionId)
  const listedSessions = activeListedSessions(sessions).sort(
    (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
  )
  const pastSessions = archivedSessions(sessions).sort(
    (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
  )
  const [sessionName, setSessionName] = useState(currentSession?.name ?? '')
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null)
  const [pastExpanded, setPastExpanded] = useState(false)

  useEffect(() => {
    setSessionName(currentSession?.name ?? '')
  }, [currentSession?.id, currentSession?.name])

  const body = (
    <div className="space-y-4">
      <section className="rounded-2xl bg-surface-elevated p-4">
        <h2 className="text-lg font-semibold">{t('settings.session')}</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {currentSession
            ? `${t('record.start')}：${formatDateTime(currentSession.startedAt)}`
            : t('settings.noActiveSession')}
        </p>
        <label className="mt-4 block">
          <span className="text-sm text-text-secondary">{t('settings.sessionName')}</span>
          <input
            className="mt-2 min-h-11 w-full rounded-xl border border-surface-muted bg-surface px-3 text-text-primary"
            disabled={!currentSession}
            value={sessionName}
            onChange={(event) => setSessionName(event.target.value)}
          />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            disabled={!currentSession || !sessionName.trim()}
            onClick={() => {
              if (!currentSession) return
              try {
                updateSessionName(currentSession.id, sessionName)
                toast.success(t('settings.sessionRenamed'))
              } catch (caught) {
                toast.error(caught instanceof Error ? caught.message : t('settings.renameSessionFailed'))
              }
            }}
          >
            {t('settings.renameSession')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const session = createNewSession()
              setSessionName(session.name)
              toast.success(t('settings.sessionCreated'))
            }}
          >
            {t('settings.newSession')}
          </Button>
        </div>
        <Button
          className="mt-3"
          variant="ghost"
          fullWidth
          disabled={!currentSession}
          onClick={() => {
            endCurrentSession()
            toast.success(t('settings.sessionEnded'))
          }}
        >
          {t('settings.endCurrent')}
        </Button>
      </section>

      <section className="rounded-2xl bg-surface-elevated p-4">
        <h3 className="text-sm font-semibold text-text-secondary">
          {t('settings.switchSession')} · {listedSessions.length}
        </h3>
        <div className="mt-3 space-y-2">
          {listedSessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              currentSessionId={currentSessionId}
              matchCount={countSessionMatches(session.id, matches, activeMatches)}
              onSwitch={() => {
                try {
                  switchSession(session.id)
                  setSessionName(session.name)
                  toast.success(`${t('settings.switchedTo')} ${session.name}`)
                  onClose?.()
                } catch (caught) {
                  toast.error(caught instanceof Error ? caught.message : t('settings.switchSessionFailed'))
                }
              }}
              onArchive={() => {
                try {
                  archiveSession(session.id)
                  toast.success(t('session.archived'))
                } catch (caught) {
                  toast.error(caught instanceof Error ? caught.message : t('session.archiveFailed'))
                }
              }}
              onDelete={() => setDeleteTarget(session)}
            />
          ))}
        </div>
      </section>

      <SessionMergeTool
        sessions={sessions}
        onMerge={(sourceId, targetId) => {
          mergeSessions(sourceId, targetId)
          if (currentSessionId === sourceId) {
            const target = sessions.find((session) => session.id === targetId)
            if (target) setSessionName(target.name)
          }
        }}
      />

      {pastSessions.length ? (
        <section className="rounded-2xl bg-surface-elevated p-4">
          <button
            type="button"
            className="flex w-full items-center justify-between text-sm font-semibold text-text-secondary outline-none"
            onClick={() => setPastExpanded((value) => !value)}
          >
            <span>
              {t('session.pastSessions')} · {pastSessions.length}
            </span>
            <span>{pastExpanded ? '▲' : '▼'}</span>
          </button>
          {pastExpanded ? (
            <div className="mt-3 space-y-2">
              {pastSessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  currentSessionId={currentSessionId}
                  matchCount={countSessionMatches(session.id, matches, activeMatches)}
                  onSwitch={() => {
                    try {
                      switchSession(session.id)
                      setSessionName(session.name)
                      toast.success(`${t('settings.switchedTo')} ${session.name}`)
                      onClose?.()
                    } catch (caught) {
                      toast.error(caught instanceof Error ? caught.message : t('settings.switchSessionFailed'))
                    }
                  }}
                  onUnarchive={() => {
                    try {
                      unarchiveSession(session.id)
                      toast.success(t('session.unarchived'))
                    } catch (caught) {
                      toast.error(caught instanceof Error ? caught.message : t('session.unarchiveFailed'))
                    }
                  }}
                  onDelete={() => setDeleteTarget(session)}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )

  const deletePrompt = (
    <PermanentDeletePrompt
      open={deleteTarget !== null}
      title={t('session.deleteTitle')}
      description={t('session.deleteDesc')}
      detail={
        deleteTarget
          ? `${deleteTarget.name} · ${countSessionMatches(deleteTarget.id, matches, activeMatches)} ${t('session.matchCount')}`
          : undefined
      }
      onClose={() => setDeleteTarget(null)}
      onBackup={onBackup}
      onConfirm={() => {
        if (!deleteTarget) return
        try {
          deleteSession(deleteTarget.id)
          setDeleteTarget(null)
          toast.success(t('session.deleted'))
        } catch (caught) {
          toast.error(caught instanceof Error ? caught.message : t('session.deleteFailed'))
        }
      }}
    />
  )

  if (compact) {
    return (
      <>
        <BottomSheet open={Boolean(open)} title={t('settings.session')} onClose={() => onClose?.()}>
          {body}
        </BottomSheet>
        {deletePrompt}
      </>
    )
  }

  return (
    <>
      {body}
      {deletePrompt}
    </>
  )
}
