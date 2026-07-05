import { useEffect, useMemo, useState } from 'react'
import { SessionManager } from '@/components/session/SessionManager'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/lib/i18n'
import { getSessionDateLabel, isSameLocalDate } from '@/lib/sessions'
import { formatDateTime } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'

export function SessionDayPrompt() {
  const { t } = useI18n()
  const toast = useToast()
  const hydrated = useAppStore((s) => s.hydrated)
  const groupCode = useAppStore((s) => s.settings.lastGroupCode)
  const groupCollabBootstrapped = useAppStore((s) => s.settings.groupCollabBootstrapped)
  const dismissedFor = useAppStore((s) => s.settings.sessionDayPromptDismissedFor)
  const sessions = useAppStore((s) => s.sessions)
  const matches = useAppStore((s) => s.matches)
  const currentSessionId = useAppStore((s) => s.currentSessionId)
  const createNewSession = useAppStore((s) => s.createNewSession)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const [open, setOpen] = useState(false)
  const [managerOpen, setManagerOpen] = useState(false)

  const todayLabel = useMemo(() => getSessionDateLabel(), [])
  const currentSession = sessions.find((session) => session.id === currentSessionId)
  const completedCount = useMemo(() => {
    if (!currentSessionId) return 0
    return matches.filter((match) => match.sessionId === currentSessionId && match.deletedAt === null).length
  }, [currentSessionId, matches])

  useEffect(() => {
    if (!hydrated) return
    if (groupCode && !groupCollabBootstrapped) return
    if (!currentSession || currentSession.endedAt !== null) {
      setOpen(false)
      return
    }
    if (dismissedFor === todayLabel) {
      setOpen(false)
      return
    }
    if (isSameLocalDate(currentSession.startedAt)) {
      setOpen(false)
      return
    }
    setOpen(true)
  }, [
    currentSession,
    dismissedFor,
    groupCollabBootstrapped,
    groupCode,
    hydrated,
    todayLabel,
  ])

  const dismissForToday = () => {
    updateSettings({ sessionDayPromptDismissedFor: todayLabel })
    setOpen(false)
  }

  if (!currentSession) return null

  return (
    <>
      <BottomSheet open={open} title={t('sessionDay.title')} onClose={dismissForToday}>
        <p className="text-sm text-text-secondary">
          {t('sessionDay.intro').replace('{today}', todayLabel)}
        </p>
        <p className="mt-2 text-sm">
          <span className="font-semibold">{currentSession.name}</span>
          <span className="mt-1 block text-xs text-text-secondary">
            {formatDateTime(currentSession.startedAt)} · {completedCount} {t('session.matchCount')}
          </span>
        </p>
        <p className="mt-2 text-xs text-text-secondary">{t('sessionDay.question')}</p>
        <div className="mt-4 space-y-2">
          <Button
            fullWidth
            onClick={() => {
              createNewSession()
              dismissForToday()
              toast.success(t('record.sessionStarted'))
            }}
          >
            {t('sessionDay.newSession')}
          </Button>
          <Button variant="secondary" fullWidth onClick={dismissForToday}>
            {t('sessionDay.continue')}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              setOpen(false)
              setManagerOpen(true)
            }}
          >
            {t('sessionDay.manage')}
          </Button>
        </div>
      </BottomSheet>

      <SessionManager
        compact
        open={managerOpen}
        onClose={() => {
          setManagerOpen(false)
          dismissForToday()
        }}
        onBackup={() => {
          setManagerOpen(false)
          dismissForToday()
          setActiveTab('settings')
        }}
      />
    </>
  )
}
