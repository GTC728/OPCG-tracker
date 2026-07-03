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

    return () => {
      cancelled = true
      stopGroupCollabRealtime()
    }
  }, [groupCode, groupCollabBootstrapped, groupCollabEnabled, hydrated, updateSettings])
}
