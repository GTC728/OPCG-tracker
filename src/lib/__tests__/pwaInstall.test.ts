import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dismissPwaInstallNudge,
  isPwaInstallNudgeDismissed,
  PWA_INSTALL_DISMISS_KEY,
  shouldShowPwaInstallNudge,
} from '@/lib/pwaInstall'

describe('PWA install nudge dismiss', () => {
  const store: Record<string, string> = {}

  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key]
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows until the user dismisses', () => {
    expect(isPwaInstallNudgeDismissed()).toBe(false)
    expect(shouldShowPwaInstallNudge()).toBe(true)
  })

  it('never shows again after dismiss', () => {
    dismissPwaInstallNudge()
    expect(store[PWA_INSTALL_DISMISS_KEY]).toBe('1')
    expect(isPwaInstallNudgeDismissed()).toBe(true)
    expect(shouldShowPwaInstallNudge()).toBe(false)
  })
})
