import { useEffect } from 'react'
import {
  bootstrapGroupCollab,
  pullGroupCollabState,
  startGroupCollabRealtime,
  stopGroupCollabRealtime,
} from '@/lib/groupSync'
import { getAppState, useAppStore } from '@/stores/appStore'

export function useGroupCollab() {
  const hydrated = useAppStore((state) => state.hydrated)
  const groupCollabEnabled = useAppStore((state) => state.settings.groupCollabEnabled)
  const groupCollabBootstrapped = useAppStore((state) => state.settings.groupCollabBootstrapped)
  const groupCode = useAppStore((state) => state.settings.lastGroupCode)
  const updateSettings = useAppStore((state) => state.updateSettings)

  useEffect(() => {
    if (!hydrated || !groupCollabEnabled || !groupCode) {
      stopGroupCollabRealtime()
      return
    }

    let cancelled = false

    async function init() {
      try {
        if (!groupCollabBootstrapped) {
          await bootstrapGroupCollab(groupCode!, getAppState())
          if (!cancelled) {
            updateSettings({ groupCollabBootstrapped: true })
          }
        } else {
          await pullGroupCollabState(groupCode!)
        }
        if (!cancelled) {
          await startGroupCollabRealtime(groupCode!)
        }
      } catch (error) {
        console.error('Group collab init failed', error)
      }
    }

    void init()

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !groupCode) return
      void pullGroupCollabState(groupCode).catch((error) => {
        console.error('Group collab pull failed', error)
      })
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    const pollId = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || !groupCode) return
      void pullGroupCollabState(groupCode).catch((error) => {
        console.error('Group collab poll failed', error)
      })
    }, 5000)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.clearInterval(pollId)
      stopGroupCollabRealtime()
    }
  }, [groupCode, groupCollabBootstrapped, groupCollabEnabled, hydrated, updateSettings])
}
