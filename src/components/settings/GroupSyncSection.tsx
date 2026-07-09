import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { flushGroupCollabSyncNow, isGroupCollabPushEnabled } from '@/lib/groupSync'
import { useI18n } from '@/lib/i18n'
import { getCachedSyncPendingCount } from '@/lib/syncQueue'
import { uiCard } from '@/lib/uiSurface'
import { useAppStore } from '@/stores/appStore'

function formatSyncTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

interface GroupSyncSectionProps {
  compact?: boolean
}

export function GroupSyncSection({ compact = false }: GroupSyncSectionProps) {
  const { t } = useI18n()
  const settings = useAppStore((state) => state.settings)
  const setGroupSyncPaused = useAppStore((state) => state.setGroupSyncPaused)
  const state = useAppStore((s) => s)
  const inGroup = Boolean(settings.lastGroupCode)
  const pendingCount = getCachedSyncPendingCount()
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true
  const [syncBusy, setSyncBusy] = useState(false)

  const statusLine = useMemo(() => {
    if (!inGroup) return t('systemStatus.syncDisabled')
    if (settings.groupSyncPaused) return t('systemStatus.syncPaused')
    if (!online) return t('sync.offline')
    if (settings.lastGroupSyncError) return settings.lastGroupSyncError
    if (pendingCount > 0) return t('sync.pendingCount').replace('{n}', String(pendingCount))
    if (settings.lastGroupSyncAt) {
      return t('systemStatus.syncedAt').replace('{time}', formatSyncTime(settings.lastGroupSyncAt))
    }
    return t('systemStatus.syncReady')
  }, [inGroup, online, pendingCount, settings.groupSyncPaused, settings.lastGroupSyncAt, settings.lastGroupSyncError, t])

  const handleRetry = () => {
    if (!settings.lastGroupCode) return
    flushGroupCollabSyncNow(settings.lastGroupCode)
  }

  const handleTogglePause = async () => {
    setSyncBusy(true)
    try {
      await setGroupSyncPaused(!settings.groupSyncPaused)
    } finally {
      setSyncBusy(false)
    }
  }

  const pushEnabled = isGroupCollabPushEnabled(state)

  return (
    <section className={[uiCard, compact ? 'space-y-2 p-3' : 'space-y-2 p-3'].join(' ')}>
      <h3 className="text-sm font-semibold">{t('systemStatus.syncTitle')}</h3>
      <p className="text-xs text-text-secondary">{statusLine}</p>
      {!compact ? (
        <p className="text-[11px] leading-relaxed text-text-secondary">{t('systemStatus.syncModel')}</p>
      ) : null}
      {settings.deviceLabel ? (
        <p className="text-[11px] text-text-secondary">
          {t('systemStatus.device')}: {settings.deviceLabel}
        </p>
      ) : null}
      {inGroup ? (
        <div className="flex flex-col gap-2 pt-1">
          <Button
            variant={settings.groupSyncPaused ? 'primary' : 'secondary'}
            className="min-h-9 w-full text-xs"
            disabled={syncBusy}
            onClick={() => void handleTogglePause()}
          >
            {settings.groupSyncPaused ? t('systemStatus.resumeSync') : t('systemStatus.pauseSync')}
          </Button>
          {pushEnabled && online ? (
            <Button variant="secondary" className="min-h-9 w-full text-xs" onClick={handleRetry}>
              {t('systemStatus.retrySync')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
