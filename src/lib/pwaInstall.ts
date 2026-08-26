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
export const PWA_OPEN_INSTALL_EVENT = 'opcg-open-pwa-install'

let pendingOpenInstallPage = false

export function isPwaInstallNudgeDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false
  return Boolean(localStorage.getItem(PWA_INSTALL_DISMISS_KEY))
}

export function dismissPwaInstallNudge(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(PWA_INSTALL_DISMISS_KEY, '1')
  notifyInstallState()
}

export function shouldShowPwaInstallNudge(): boolean {
  if (isPwaStandalone()) return false
  return !isPwaInstallNudgeDismissed()
}

export function requestOpenPwaInstallPage(): void {
  pendingOpenInstallPage = true
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(PWA_OPEN_INSTALL_EVENT))
}

export function consumePendingOpenPwaInstallPage(): boolean {
  if (!pendingOpenInstallPage) return false
  pendingOpenInstallPage = false
  return true
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
