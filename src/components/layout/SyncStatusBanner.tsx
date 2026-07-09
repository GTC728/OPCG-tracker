import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { uiCalloutWarning } from '@/lib/uiSurface'
import { getCachedSyncPendingCount, subscribeSyncPendingCount } from '@/lib/syncQueue'
import { useAppStore } from '@/stores/appStore'

function formatSyncTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function SyncStatusBanner({ onOpenDetails }: { onOpenDetails?: () => void }) {
  const { t } = useI18n()
  const inGroup = useAppStore((state) => Boolean(state.settings.lastGroupCode))
  const lastSyncAt = useAppStore((state) => state.settings.lastGroupSyncAt)
  const lastSyncError = useAppStore((state) => state.settings.lastGroupSyncError)
  const [pendingCount, setPendingCount] = useState(getCachedSyncPendingCount())
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    if (!inGroup) return
    return subscribeSyncPendingCount(setPendingCount)
  }, [inGroup])

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

  if (!inGroup) return null

  const clickable = Boolean(onOpenDetails)
  const wrapperClass = clickable ? 'cursor-pointer active:opacity-90' : ''

  if (!online) {
    return (
      <button
        type="button"
        disabled={!clickable}
        className={[uiCalloutWarning, 'border-b px-4 py-2 text-center text-xs w-full', wrapperClass].join(' ')}
        role="status"
        onClick={onOpenDetails}
      >
        {t('sync.offline')}
        {pendingCount > 0 ? ` · ${t('sync.pendingCount').replace('{n}', String(pendingCount))}` : null}
      </button>
    )
  }

  if (lastSyncError) {
    return (
      <button
        type="button"
        disabled={!clickable}
        className={[uiCalloutWarning, 'border-b px-4 py-2 text-center text-xs w-full', wrapperClass].join(' ')}
        role="status"
        onClick={onOpenDetails}
      >
        {lastSyncError}
        {pendingCount > 0 ? ` · ${t('sync.pendingCount').replace('{n}', String(pendingCount))}` : null}
      </button>
    )
  }

  if (pendingCount > 0) {
    return (
      <button
        type="button"
        disabled={!clickable}
        className={[
          'border-b border-brand-500/30 bg-brand-500/10 px-4 py-2 text-center text-xs text-[var(--color-link)] w-full',
          wrapperClass,
        ].join(' ')}
        role="status"
        onClick={onOpenDetails}
      >
        {t('sync.pendingCount').replace('{n}', String(pendingCount))}
      </button>
    )
  }

  if (lastSyncAt) {
    return (
      <button
        type="button"
        disabled={!clickable}
        className={[
          'border-b border-success/20 bg-success/5 px-4 py-1.5 text-center text-[10px] text-text-secondary w-full',
          wrapperClass,
        ].join(' ')}
        role="status"
        onClick={onOpenDetails}
      >
        {t('systemStatus.bannerSynced').replace('{time}', formatSyncTime(lastSyncAt))}
      </button>
    )
  }

  return null
}
