import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { groupRoleLabel, isBannedFromGroup } from '@/lib/groupPermissions'
import { uiCalloutWarning } from '@/lib/uiSurface'
import { getCachedSyncPendingCount, subscribeSyncPendingCount } from '@/lib/syncQueue'
import { useAppStore } from '@/stores/appStore'

function formatSyncTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function SyncStatusBanner({ onOpenWorkspace }: { onOpenWorkspace?: () => void }) {
  const { t } = useI18n()
  const groupCode = useAppStore((state) => state.settings.lastGroupCode)
  const groupMemberRole = useAppStore((state) => state.settings.groupMemberRole)
  const groupMemberBannedAt = useAppStore((state) => state.settings.groupMemberBannedAt)
  const lastSyncAt = useAppStore((state) => state.settings.lastGroupSyncAt)
  const lastSyncError = useAppStore((state) => state.settings.lastGroupSyncError)
  const [pendingCount, setPendingCount] = useState(getCachedSyncPendingCount())
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    if (!groupCode) return
    return subscribeSyncPendingCount(setPendingCount)
  }, [groupCode])

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const workspacePrefix = groupCode
    ? `${groupCode}${groupMemberRole ? ` · ${groupRoleLabel(groupMemberRole)}` : ''}`
    : ''

  if (!groupCode) return null

  const clickable = Boolean(onOpenWorkspace)
  const wrapperClass = clickable ? 'cursor-pointer active:opacity-90' : ''

  const baseClass =
    'border-b px-4 py-1.5 text-center text-[10px] w-full flex items-center justify-center gap-1.5 min-h-[28px]'

  if (isBannedFromGroup(groupMemberBannedAt)) {
    return (
      <button
        type="button"
        disabled={!clickable}
        className={[uiCalloutWarning, baseClass, wrapperClass].join(' ')}
        role="status"
        onClick={onOpenWorkspace}
      >
        <span className="font-medium">{workspacePrefix}</span>
        <span className="text-text-secondary">·</span>
        <span>{t('members.selfBanned')}</span>
      </button>
    )
  }

  if (!online) {
    return (
      <button
        type="button"
        disabled={!clickable}
        className={[uiCalloutWarning, baseClass, wrapperClass].join(' ')}
        role="status"
        onClick={onOpenWorkspace}
      >
        <span className="font-medium text-text-primary">{workspacePrefix}</span>
        <span className="text-text-secondary">·</span>
        <span>{t('sync.offline')}</span>
        {pendingCount > 0 ? (
          <span className="text-text-secondary">
            · {t('sync.pendingCount').replace('{n}', String(pendingCount))}
          </span>
        ) : null}
      </button>
    )
  }

  if (lastSyncError) {
    return (
      <button
        type="button"
        disabled={!clickable}
        className={[uiCalloutWarning, baseClass, wrapperClass].join(' ')}
        role="status"
        onClick={onOpenWorkspace}
      >
        <span className="font-medium text-text-primary">{workspacePrefix}</span>
        <span className="text-text-secondary">·</span>
        <span className="truncate">{lastSyncError}</span>
        {pendingCount > 0 ? (
          <span className="shrink-0 text-text-secondary">
            · {t('sync.pendingCount').replace('{n}', String(pendingCount))}
          </span>
        ) : null}
      </button>
    )
  }

  if (pendingCount > 0) {
    return (
      <button
        type="button"
        disabled={!clickable}
        className={[
          'border-b border-brand-500/30 bg-brand-500/10 text-[var(--color-link)]',
          baseClass,
          wrapperClass,
        ].join(' ')}
        role="status"
        onClick={onOpenWorkspace}
      >
        <span className="font-medium">{workspacePrefix}</span>
        <span className="opacity-70">·</span>
        <span>{t('sync.pendingCount').replace('{n}', String(pendingCount))}</span>
      </button>
    )
  }

  if (lastSyncAt) {
    return (
      <button
        type="button"
        disabled={!clickable}
        className={[
          'border-b border-success/20 bg-success/5 text-text-secondary',
          baseClass,
          wrapperClass,
        ].join(' ')}
        role="status"
        onClick={onOpenWorkspace}
      >
        <span className="font-medium text-text-primary">{workspacePrefix}</span>
        <span>·</span>
        <span>{t('systemStatus.bannerSynced').replace('{time}', formatSyncTime(lastSyncAt))}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={!clickable}
      className={[
        'border-b border-surface-muted bg-surface-elevated/50 text-text-secondary',
        baseClass,
        wrapperClass,
      ].join(' ')}
      role="status"
      onClick={onOpenWorkspace}
    >
      <span className="font-medium text-text-primary">{workspacePrefix}</span>
      <span>·</span>
      <span>{t('workspace.openHub')}</span>
    </button>
  )
}
