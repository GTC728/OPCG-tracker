import { useEffect } from 'react'
import { resetGroupAutoSyncClocks, runGroupForegroundSync } from '@/lib/groupAutoSync'
import {
  initializeGroupCollab,
  startGroupCollabRealtime,
  stopGroupCollabRealtime,
} from '@/lib/groupSync'
import { useAppStore } from '@/stores/appStore'

const FOREGROUND_POLL_MS = 12_000

export function useGroupCollab() {
  const hydrated = useAppStore((state) => state.hydrated)
  const groupCollabBootstrapped = useAppStore((state) => state.settings.groupCollabBootstrapped)
  const groupDataBoundCode = useAppStore((state) => state.settings.groupDataBoundCode)
  const groupCode = useAppStore((state) => state.settings.lastGroupCode)
  const updateSettings = useAppStore((state) => state.updateSettings)

  useEffect(() => {
    if (!hydrated || !groupCode) {
      stopGroupCollabRealtime()
      resetGroupAutoSyncClocks()
      return
    }

    let cancelled = false

    async function init() {
      try {
        const needsRebind = !groupCollabBootstrapped || groupDataBoundCode !== groupCode
        if (needsRebind) {
          await initializeGroupCollab(groupCode!)
          if (!cancelled) {
            let groupMemberRole = useAppStore.getState().settings.groupMemberRole
            let groupMemberBannedAt = useAppStore.getState().settings.groupMemberBannedAt
            try {
              const { fetchCurrentGroupMembership } = await import('@/lib/cloudSync')
              const membership = await fetchCurrentGroupMembership(groupCode!)
              groupMemberRole = membership?.role ?? groupMemberRole
              groupMemberBannedAt = membership?.bannedAt ?? null
            } catch {
              // offline
            }
            updateSettings({
              groupCollabBootstrapped: true,
              groupCollabEnabled: true,
              groupDataBoundCode: groupCode,
              groupMemberRole,
              groupMemberBannedAt,
            })
          }
        }
        if (!cancelled) {
          await runGroupForegroundSync(groupCode!, 'init')
          await startGroupCollabRealtime(groupCode!)
        }
      } catch (error) {
        console.error('Group collab init failed', error)
        if (!cancelled) {
          updateSettings({
            lastGroupSyncError: error instanceof Error ? error.message : '群組同步失敗',
          })
        }
      }
    }

    void init()

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !groupCode) return
      void runGroupForegroundSync(groupCode, 'visibility').catch((error) => {
        console.error('Group collab pull failed', error)
      })
    }

    const onOnline = () => {
      if (!groupCode) return
      void runGroupForegroundSync(groupCode, 'online').catch((error) => {
        console.error('Group collab pull failed', error)
      })
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('online', onOnline)
    const pollId = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || !groupCode) return
      void runGroupForegroundSync(groupCode, 'interval').catch((error) => {
        console.error('Group collab poll failed', error)
      })
    }, FOREGROUND_POLL_MS)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('online', onOnline)
      window.clearInterval(pollId)
      stopGroupCollabRealtime()
      resetGroupAutoSyncClocks()
    }
  }, [groupCode, groupCollabBootstrapped, groupDataBoundCode, hydrated, updateSettings])
}
