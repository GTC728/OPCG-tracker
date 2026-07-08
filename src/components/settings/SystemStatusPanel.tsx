import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { flushGroupCollabSyncNow, isGroupCollabPushEnabled } from '@/lib/groupSync'
import { useI18n } from '@/lib/i18n'
import { getCachedSyncPendingCount } from '@/lib/syncQueue'
import { uiCard } from '@/lib/uiSurface'
import type { AuditEntry, AuditKind } from '@/types'
import { useAppStore } from '@/stores/appStore'

const AUDIT_KIND_LABEL: Record<AuditKind, string> = {
  match_complete: '完成',
  match_undo: '還原',
  match_edit: '編輯',
  match_delete: '刪除',
  import: '匯入',
  import_revert: '撤銷',
  sync: '同步',
  session: '場次',
}

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

function AuditRow({ entry }: { entry: AuditEntry }) {
  return (
    <li className="flex items-start gap-2 border-b border-[var(--ui-border)] py-2 last:border-0">
      <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
        {AUDIT_KIND_LABEL[entry.kind]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs">{entry.message}</p>
        <p className="mt-0.5 text-[10px] text-text-secondary">{formatAuditTime(entry.at)}</p>
      </div>
    </li>
  )
}

function formatAuditTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SystemStatusPanel() {
  const { t } = useI18n()
  const settings = useAppStore((state) => state.settings)
  const auditLog = useAppStore((state) => state.auditLog)
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
    if (settings.lastGroupSyncAt) return t('systemStatus.syncedAt').replace('{time}', formatSyncTime(settings.lastGroupSyncAt))
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
    <div className="space-y-3">
      <section className={[uiCard, 'space-y-2 p-3'].join(' ')}>
        <h3 className="text-sm font-semibold">{t('systemStatus.syncTitle')}</h3>
        <p className="text-xs text-text-secondary">{statusLine}</p>
        <p className="text-[11px] leading-relaxed text-text-secondary">{t('systemStatus.syncModel')}</p>
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

      <section className={[uiCard, 'p-3'].join(' ')}>
        <h3 className="text-sm font-semibold">{t('systemStatus.auditTitle')}</h3>
        <p className="mt-1 text-[11px] text-text-secondary">{t('systemStatus.auditDesc')}</p>
        {auditLog.length ? (
          <ol className="mt-2 max-h-64 overflow-y-auto">
            {auditLog.slice(0, 30).map((entry) => (
              <AuditRow key={entry.id} entry={entry} />
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-xs text-text-secondary">{t('systemStatus.auditEmpty')}</p>
        )}
      </section>
    </div>
  )
}
