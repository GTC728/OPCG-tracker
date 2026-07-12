import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { flushGroupCollabSyncNow } from '@/lib/groupSync'
import { listSyncQueue, type SyncQueueOp, type SyncQueueRecord } from '@/lib/syncQueue'
import { formatAuditTime } from '@/lib/auditLog'
import { useAppStore } from '@/stores/appStore'

function describeSyncOp(op: SyncQueueOp): string {
  switch (op.kind) {
    case 'upsert_active':
      return `更新進行中對局 ×${op.matchIds.length}`
    case 'delete_active':
      return `刪除進行中對局`
    case 'upsert_matches':
      return `同步完成對局 ×${op.matchIds.length}`
    case 'upsert_players':
      return `同步玩家 ×${op.playerIds.length}`
    case 'delete_player':
      return `刪除玩家`
    case 'upsert_sessions':
      return `同步場次 ×${op.sessionIds.length}`
    case 'merge_players':
      return `合併玩家`
    default:
      return '同步操作'
  }
}

export function SyncQueuePanel() {
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
      <p className="font-semibold text-text-primary">同步佇列</p>
      {loading && !items.length ? (
        <p className="mt-2 text-text-secondary">讀取中…</p>
      ) : null}
      {!loading && !items.length ? (
        <p className="mt-2 text-text-secondary">沒有待送項目</p>
      ) : null}
      {items.length ? (
        <ol className="mt-2 max-h-48 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg bg-surface-elevated p-2">
              <p className="font-medium text-text-primary">{describeSyncOp(item.op)}</p>
              <p className="mt-0.5 text-text-secondary">
                {formatAuditTime(item.createdAt)}
                {item.attempts > 0 ? ` · 重試 ${item.attempts} 次` : ''}
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
          立即重送佇列
        </Button>
      ) : null}
    </div>
  )
}
