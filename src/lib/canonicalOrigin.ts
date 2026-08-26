import { LIVE_APP_URL } from '@/lib/constants'

const CANONICAL_HOST = new URL(LIVE_APP_URL).hostname

const REDIRECT_HOSTS = new Set([
  `www.${CANONICAL_HOST}`,
  'opcg-tracker-v2.pages.dev',
])

/** Send www / pages.dev traffic to the canonical apex domain so auth storage stays on one origin. */
export function ensureCanonicalOrigin(): void {
  const { hostname, pathname, search, hash } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') return
  if (hostname === CANONICAL_HOST) return
  if (!REDIRECT_HOSTS.has(hostname)) return

  const base = LIVE_APP_URL.replace(/\/+$/, '')
  window.location.replace(`${base}${pathname}${search}${hash}`)
}

export function getCanonicalOrigin(): string {
  if (import.meta.env.DEV) {
    return window.location.origin.replace(/\/+$/, '')
  }
  return LIVE_APP_URL.replace(/\/+$/, '')
}
