export type PwaInstallPlatform = 'android' | 'ios' | 'desktop-chromium' | 'other'

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function isPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    // iOS Safari legacy flag
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function detectPwaInstallPlatform(): PwaInstallPlatform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Edg|Chrome/i.test(ua)) return 'desktop-chromium'
  return 'other'
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function notifyInstallState(): void {
  for (const listener of listeners) listener()
}

export function initPwaInstallListener(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredInstallPrompt = event as BeforeInstallPromptEvent
    notifyInstallState()
  })

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null
    notifyInstallState()
  })
}

export function subscribePwaInstallState(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const PWA_INSTALL_DISMISS_KEY = 'opcg-pwa-install-dismissed-at'
export const PWA_INSTALL_SNOOZE_MS = 21 * 24 * 60 * 60 * 1000

export function isPwaInstallNudgeDismissed(now = Date.now()): boolean {
  if (typeof localStorage === 'undefined') return false
  const raw = localStorage.getItem(PWA_INSTALL_DISMISS_KEY)
  if (!raw) return false
  const dismissedAt = Number(raw)
  if (!Number.isFinite(dismissedAt)) return false
  return now - dismissedAt < PWA_INSTALL_SNOOZE_MS
}

export function dismissPwaInstallNudge(now = Date.now()): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(PWA_INSTALL_DISMISS_KEY, String(now))
  notifyInstallState()
}

export function shouldShowPwaInstallNudge(now = Date.now()): boolean {
  if (isPwaStandalone()) return false
  return !isPwaInstallNudgeDismissed(now)
}

export function canPromptPwaInstall(): boolean {
  return deferredInstallPrompt !== null
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const prompt = deferredInstallPrompt
  if (!prompt) return 'unavailable'

  deferredInstallPrompt = null
  notifyInstallState()

  await prompt.prompt()
  const { outcome } = await prompt.userChoice
  notifyInstallState()
  return outcome
}
