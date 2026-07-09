import { useEffect } from 'react'
import {
  flushGroupCollabSyncNow,
  initializeGroupCollab,
  pullGroupCollabState,
  startGroupCollabRealtime,
  stopGroupCollabRealtime,
} from '@/lib/groupSync'
import { useAppStore } from '@/stores/appStore'

export function useGroupCollab() {
  const hydrated = useAppStore((state) => state.hydrated)
  const groupCollabBootstrapped = useAppStore((state) => state.settings.groupCollabBootstrapped)
  const groupDataBoundCode = useAppStore((state) => state.settings.groupDataBoundCode)
  const groupCode = useAppStore((state) => state.settings.lastGroupCode)
  const updateSettings = useAppStore((state) => state.updateSettings)

  useEffect(() => {
    if (!hydrated || !groupCode) {
      stopGroupCollabRealtime()
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
            try {
              const { fetchGroupMemberRole } = await import('@/lib/cloudSync')
              groupMemberRole = await fetchGroupMemberRole(groupCode!)
            } catch {
              // offline
            }
            updateSettings({
              groupCollabBootstrapped: true,
              groupCollabEnabled: true,
              groupDataBoundCode: groupCode,
              groupMemberRole,
            })
          }
        } else {
          await pullGroupCollabState(groupCode!)
        }
        if (!cancelled) {
          flushGroupCollabSyncNow(groupCode!)
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
      flushGroupCollabSyncNow(groupCode)
      void pullGroupCollabState(groupCode).catch((error) => {
        console.error('Group collab pull failed', error)
      })
    }

    const onOnline = () => {
      if (!groupCode) return
      flushGroupCollabSyncNow(groupCode)
      void pullGroupCollabState(groupCode).catch((error) => {
        console.error('Group collab pull failed', error)
      })
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('online', onOnline)
    const pollId = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || !groupCode) return
      flushGroupCollabSyncNow(groupCode)
      void pullGroupCollabState(groupCode).catch((error) => {
        console.error('Group collab poll failed', error)
      })
    }, 5000)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('online', onOnline)
      window.clearInterval(pollId)
      stopGroupCollabRealtime()
    }
  }, [groupCode, groupCollabBootstrapped, groupDataBoundCode, hydrated, updateSettings])
}
