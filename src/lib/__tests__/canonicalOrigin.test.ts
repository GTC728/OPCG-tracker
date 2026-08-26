import { describe, expect, it, vi } from 'vitest'
import { ensureCanonicalOrigin, getCanonicalOrigin } from '@/lib/canonicalOrigin'

function stubLocation(location: Partial<Location>) {
  vi.stubGlobal('window', { location } as Window)
}

describe('canonicalOrigin', () => {
  it('getCanonicalOrigin uses LIVE_APP_URL in production', () => {
    vi.stubEnv('DEV', false)
    expect(getCanonicalOrigin()).toBe('https://opcg-tracker.com')
    vi.unstubAllEnvs()
  })

  it('ensureCanonicalOrigin redirects www to apex', () => {
    const replace = vi.fn()
    stubLocation({
      hostname: 'www.opcg-tracker.com',
      pathname: '/settings',
      search: '?tab=account',
      hash: '',
      replace,
    })

    ensureCanonicalOrigin()

    expect(replace).toHaveBeenCalledWith('https://opcg-tracker.com/settings?tab=account')
    vi.unstubAllGlobals()
  })

  it('ensureCanonicalOrigin redirects pages.dev to apex', () => {
    const replace = vi.fn()
    stubLocation({
      hostname: 'opcg-tracker-v2.pages.dev',
      pathname: '/',
      search: '',
      hash: '',
      replace,
    })

    ensureCanonicalOrigin()

    expect(replace).toHaveBeenCalledWith('https://opcg-tracker.com/')
    vi.unstubAllGlobals()
  })

  it('ensureCanonicalOrigin leaves apex untouched', () => {
    const replace = vi.fn()
    stubLocation({
      hostname: 'opcg-tracker.com',
      pathname: '/',
      search: '',
      hash: '',
      replace,
    })

    ensureCanonicalOrigin()

    expect(replace).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
