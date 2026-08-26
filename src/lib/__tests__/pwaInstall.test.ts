import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dismissPwaInstallNudge,
  isPwaInstallNudgeDismissed,
  PWA_INSTALL_DISMISS_KEY,
  PWA_INSTALL_SNOOZE_MS,
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
    expect(store[PWA_INSTALL_DISMISS_KEY]).toBeUndefined()
    expect(isPwaInstallNudgeDismissed(1_000)).toBe(false)
    expect(shouldShowPwaInstallNudge(1_000)).toBe(true)
  })

  it('hides for the snooze window after dismiss', () => {
    dismissPwaInstallNudge(1_000)
    expect(isPwaInstallNudgeDismissed(1_000 + PWA_INSTALL_SNOOZE_MS - 1)).toBe(true)
    expect(isPwaInstallNudgeDismissed(1_000 + PWA_INSTALL_SNOOZE_MS + 1)).toBe(false)
  })
})
