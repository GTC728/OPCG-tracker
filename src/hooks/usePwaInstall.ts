import { useCallback, useEffect, useState } from 'react'
import {
  canPromptPwaInstall,
  detectPwaInstallPlatform,
  isPwaStandalone,
  promptPwaInstall,
  subscribePwaInstallState,
  type PwaInstallPlatform,
} from '@/lib/pwaInstall'

export function usePwaInstall(): {
  standalone: boolean
  canPrompt: boolean
  platform: PwaInstallPlatform
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
} {
  const [standalone, setStandalone] = useState(isPwaStandalone)
  const [canPrompt, setCanPrompt] = useState(canPromptPwaInstall)
  const [platform] = useState(detectPwaInstallPlatform)

  useEffect(() => {
    const sync = () => {
      setStandalone(isPwaStandalone())
      setCanPrompt(canPromptPwaInstall())
    }
    sync()
    return subscribePwaInstallState(sync)
  }, [])

  const install = useCallback(async () => promptPwaInstall(), [])

  return { standalone, canPrompt, platform, install }
}
