import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { IconAdd, IconDelete, IconEdit, IconSessions } from '@/components/ui/LobbyIcons'
import { PermanentDeletePrompt } from '@/components/ui/PermanentDeletePrompt'
import { useToast } from '@/components/ui/Toast'
import {
  activeListedSessions,
  archivedSessions,
  countSessionMatches,
} from '@/lib/entityVisibility'
import { exportSessionExcel } from '@/lib/excelExport'
import { useI18n } from '@/lib/i18n'
import { formatDateTime } from '@/lib/utils'
import { getAppState, useAppStore } from '@/stores/appStore'
import type { Session } from '@/types'

function CompactSessionRow({
  session,
  isCurrent,
  matchCount,
  canManage,
  onSwitch,
  onArchive,
  onUnarchive,
  onDelete,
  onRename,
  onExportExcel,
}: {
  session: Session
  isCurrent: boolean
  matchCount: number
  canManage?: boolean
  onSwitch: () => void
  onArchive?: () => void
  onUnarchive?: () => void
  onDelete: () => void
  onRename: () => void
  onExportExcel: () => void
}) {
  const { t } = useI18n()

  return (
    <article
      className={[
        'flex items-center gap-2 rounded-xl px-2.5 py-2 ring-1',
        isCurrent ? 'bg-brand-500/15 ring-brand-500/30' : 'bg-surface ring-surface-muted',
      ].join(' ')}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-brand-300">
        <IconSessions />
      </span>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onSwitch}>
        <p className="truncate text-sm font-semibold">{session.name}</p>
        <p className="truncate text-[11px] text-text-secondary">
          {formatDateTime(session.startedAt)} · {matchCount} {t('session.matchCount')}
        </p>
      </button>
      <div className="flex shrink-0 gap-0.5">
        <IconButton label={t('session.exportExcel')} onClick={onExportExcel}>
          <span className="text-[10px] font-bold">X</span>
        </IconButton>
        {canManage && isCurrent ? (
          <IconButton label={t('settings.renameSession')} onClick={onRename}>
            <IconEdit />
          </IconButton>
        ) : null}
        {canManage && onArchive ? (
          <IconButton label={t('session.archive')} onClick={onArchive}>
            <span className="text-[10px] font-bold">A</span>
          </IconButton>
        ) : null}
        {canManage && onUnarchive ? (
          <IconButton label={t('session.unarchive')} onClick={onUnarchive}>
            <span className="text-[10px] font-bold">U</span>
          </IconButton>
        ) : null}
        {canManage ? (
          <IconButton label={t('common.delete')} variant="danger" onClick={onDelete}>
            <IconDelete />
          </IconButton>
        ) : null}
      </div>
    </article>
  )
}

export function GroupClanSessions({ canManage = true }: { canManage?: boolean }) {
  const { t } = useI18n()
  const toast = useToast()
  const sessions = useAppStore((state) => state.sessions)
  const matches = useAppStore((state) => state.matches)
  const activeMatches = useAppStore((state) => state.activeMatches)
  const currentSessionId = useAppStore((state) => state.currentSessionId)
  const createNewSession = useAppStore((state) => state.createNewSession)
  const updateSessionName = useAppStore((state) => state.updateSessionName)
  const switchSession = useAppStore((state) => state.switchSession)
  const endCurrentSession = useAppStore((state) => state.endCurrentSession)
  const archiveSession = useAppStore((state) => state.archiveSession)
  const unarchiveSession = useAppStore((state) => state.unarchiveSession)
  const deleteSession = useAppStore((state) => state.deleteSession)

  const currentSession = sessions.find((session) => session.id === currentSessionId)
  const listedSessions = activeListedSessions(sessions).sort(
    (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
  )
  const pastSessions = archivedSessions(sessions).sort(
    (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
  )

  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null)
  const [pastExpanded, setPastExpanded] = useState(false)
  const [renameDraft, setRenameDraft] = useState(currentSession?.name ?? '')

  useEffect(() => {
    setRenameDraft(currentSession?.name ?? '')
  }, [currentSession?.id, currentSession?.name])

  const matchState = { matches, activeMatches }

  const handleExportSession = async (sessionId: string) => {
    try {
      await exportSessionExcel(getAppState(), sessionId)
      toast.success(t('session.exportExcelSuccess'))
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('session.exportExcelFailed'))
    }
  }

  return (
    <div className="space-y-2">
      {canManage ? (
        <>
          <div className="flex items-center gap-2">
            <input
              className="min-h-9 flex-1 rounded-lg border border-surface-muted bg-surface px-3 text-sm"
              disabled={!currentSession}
              value={renameDraft}
              onChange={(event) => setRenameDraft(event.target.value)}
              placeholder={t('settings.sessionName')}
            />
            <IconButton
              label={t('settings.newSession')}
              variant="brand"
              onClick={() => {
                const session = createNewSession()
                setRenameDraft(session.name)
                toast.success(t('settings.sessionCreated'))
              }}
            >
              <IconAdd />
            </IconButton>
          </div>

          {currentSession ? (
            <div className="flex gap-2">
              <Button
                className="min-h-9 flex-1 text-xs"
                disabled={!renameDraft.trim()}
                onClick={() => {
                  try {
                    updateSessionName(currentSession.id, renameDraft)
                    toast.success(t('settings.sessionRenamed'))
                  } catch (caught) {
                    toast.error(caught instanceof Error ? caught.message : t('settings.renameSessionFailed'))
                  }
                }}
              >
                {t('settings.renameSession')}
              </Button>
              <Button className="min-h-9 flex-1 text-xs" variant="secondary" onClick={() => {
                endCurrentSession()
                toast.success(t('settings.sessionEnded'))
              }}>
                {t('settings.endCurrent')}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      <ul className="space-y-1.5">
        {listedSessions.map((session) => (
          <li key={session.id}>
            <CompactSessionRow
              session={session}
              isCurrent={session.id === currentSessionId}
              matchCount={countSessionMatches(session.id, matches, activeMatches)}
              canManage={canManage}
              onSwitch={() => {
                try {
                  switchSession(session.id)
                  setRenameDraft(session.name)
                  toast.success(`${t('settings.switchedTo')} ${session.name}`)
                } catch (caught) {
                  toast.error(caught instanceof Error ? caught.message : t('settings.switchSessionFailed'))
                }
              }}
              onArchive={
                session.id !== currentSessionId
                  ? () => {
                      try {
                        archiveSession(session.id)
                        toast.success(t('session.archived'))
                      } catch (caught) {
                        toast.error(caught instanceof Error ? caught.message : t('session.archiveFailed'))
                      }
                    }
                  : undefined
              }
              onDelete={() => setDeleteTarget(session)}
              onRename={() => setRenameDraft(session.name)}
              onExportExcel={() => {
                void handleExportSession(session.id)
              }}
            />
          </li>
        ))}
      </ul>

      {pastSessions.length ? (
        <button
          type="button"
          className="w-full rounded-lg bg-surface-elevated px-3 py-2 text-left text-xs text-text-secondary ring-1 ring-surface-muted"
          onClick={() => setPastExpanded((value) => !value)}
        >
          {t('session.pastSessions')} · {pastSessions.length} {pastExpanded ? '▲' : '▼'}
        </button>
      ) : null}

      {pastExpanded ? (
        <ul className="space-y-1.5">
          {pastSessions.map((session) => (
            <li key={session.id}>
              <CompactSessionRow
                session={session}
                isCurrent={session.id === currentSessionId}
                matchCount={countSessionMatches(session.id, matchState.matches, matchState.activeMatches)}
                canManage={canManage}
                onSwitch={() => {
                  try {
                    switchSession(session.id)
                    setRenameDraft(session.name)
                    toast.success(`${t('settings.switchedTo')} ${session.name}`)
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
                onRename={() => setRenameDraft(session.name)}
                onExportExcel={() => {
                  void handleExportSession(session.id)
                }}
              />
            </li>
          ))}
        </ul>
      ) : null}

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
    </div>
  )
}
