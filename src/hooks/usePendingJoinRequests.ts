import { useCallback, useEffect, useState } from 'react'
import { canManageGroup } from '@/lib/groupPermissions'
import { listGroupJoinRequests, type GroupJoinRequest } from '@/lib/groupLobby'
import { useAppStore } from '@/stores/appStore'

const POLL_MS = 15_000

export function usePendingJoinRequests() {
  const groupCode = useAppStore((state) => state.settings.lastGroupCode)
  const role = useAppStore((state) => state.settings.groupMemberRole)
  const canManage = canManageGroup(role)
  const [requests, setRequests] = useState<GroupJoinRequest[]>([])

  const reload = useCallback(async () => {
    if (!groupCode || !canManage) {
      setRequests([])
      return []
    }
    try {
      const rows = await listGroupJoinRequests(groupCode)
      setRequests(rows)
      return rows
    } catch {
      return []
    }
  }, [canManage, groupCode])

  useEffect(() => {
    void reload()
    if (!groupCode || !canManage) return
    const id = window.setInterval(() => void reload(), POLL_MS)
    return () => window.clearInterval(id)
  }, [canManage, groupCode, reload])

  return { requests, pendingCount: requests.length, reload, canManage }
}
