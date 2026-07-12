import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { flushGroupCollabSyncNow } from '@/lib/groupSync'
import { listSyncQueue, type SyncQueueRecord } from '@/lib/syncQueue'
import { formatAuditTime } from '@/lib/auditLog'
import { useI18n } from '@/lib/i18n'
import { describeSyncOp } from '@/lib/syncQueueI18n'
import { useAppStore } from '@/stores/appStore'

export function SyncQueuePanel() {
  const { t } = useI18n()
  const groupCode = useAppStore((state) => state.settings.lastGroupCode)
  const [items, setItems] = useState<SyncQueueRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      setLoading(true)
      try {
        const queue = await listSyncQueue()
        if (!cancelled) setItems(queue)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void refresh()
    const id = window.setInterval(() => void refresh(), 3000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [groupCode])

  if (!groupCode) return null

  return (
    <div className="rounded-xl bg-surface p-3 text-xs">
      <p className="font-semibold text-text-primary">{t('syncQueue.title')}</p>
      {loading && !items.length ? (
        <p className="mt-2 text-text-secondary">{t('syncQueue.loading')}</p>
      ) : null}
      {!loading && !items.length ? (
        <p className="mt-2 text-text-secondary">{t('syncQueue.empty')}</p>
      ) : null}
      {items.length ? (
        <ol className="mt-2 max-h-48 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg bg-surface-elevated p-2">
              <p className="font-medium text-text-primary">{describeSyncOp(item.op, t)}</p>
              <p className="mt-0.5 text-text-secondary">
                {formatAuditTime(item.createdAt)}
                {item.attempts > 0
                  ? ` · ${t('syncQueue.retryCount').replace('{n}', String(item.attempts))}`
                  : ''}
              </p>
              {item.lastError ? (
                <p className="mt-1 text-amber-200">{item.lastError}</p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
      {items.length ? (
        <Button
          variant="secondary"
          className="mt-3 min-h-9 w-full text-xs"
          onClick={() => flushGroupCollabSyncNow(groupCode)}
        >
          {t('syncQueue.flushNow')}
        </Button>
      ) : null}
    </div>
  )
}
