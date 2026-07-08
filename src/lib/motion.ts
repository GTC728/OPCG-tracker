/** Interaction feedback — sounds & motion helpers (V4.2.1). */

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioContext) {
    try {
      audioContext = new AudioContext()
    } catch {
      return null
    }
  }
  return audioContext
}

export type InteractionSound = 'tap' | 'success' | 'toggle'

export function playInteractionSound(kind: InteractionSound = 'tap'): void {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const ctx = getAudioContext()
  if (!ctx) return

  if (ctx.state === 'suspended') {
    void ctx.resume()
  }

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)

  const presets: Record<InteractionSound, { freq: number; duration: number; volume: number }> = {
    tap: { freq: 520, duration: 0.045, volume: 0.04 },
    success: { freq: 660, duration: 0.08, volume: 0.06 },
    toggle: { freq: 440, duration: 0.05, volume: 0.035 },
  }
  const preset = presets[kind]
  osc.type = 'sine'
  osc.frequency.setValueAtTime(preset.freq, now)
  gain.gain.setValueAtTime(preset.volume, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + preset.duration)
  osc.start(now)
  osc.stop(now + preset.duration)
}

export const uiPressable =
  'ui-pressable transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none'

export const uiPopIn = 'ui-pop-in'

export function bindPressFeedback(
  element: HTMLElement | null,
  sound: InteractionSound = 'tap',
): (() => void) | undefined {
  if (!element) return undefined
  const handler = () => playInteractionSound(sound)
  element.addEventListener('pointerdown', handler)
  return () => element.removeEventListener('pointerdown', handler)
}
