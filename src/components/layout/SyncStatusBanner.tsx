import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { uiCalloutWarning } from '@/lib/uiSurface'
import { getCachedSyncPendingCount, subscribeSyncPendingCount } from '@/lib/syncQueue'
import { useAppStore } from '@/stores/appStore'

export function SyncStatusBanner() {
  const { t } = useI18n()
  const inGroup = useAppStore((state) => Boolean(state.settings.lastGroupCode))
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

  if (!online) {
    return (
      <div className={[uiCalloutWarning, 'border-b px-4 py-2 text-center text-xs'].join(' ')} role="status">
        {t('sync.offline')}
        {pendingCount > 0 ? ` · ${t('sync.pendingCount').replace('{n}', String(pendingCount))}` : null}
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <div
        className="border-b border-brand-500/30 bg-brand-500/10 px-4 py-2 text-center text-xs text-[var(--color-link)]"
        role="status"
      >
        {t('sync.pendingCount').replace('{n}', String(pendingCount))}
      </div>
    )
  }

  return null
}
