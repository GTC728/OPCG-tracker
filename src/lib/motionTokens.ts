/** Canonical motion tokens. CSS mirrors these in `src/index.css`. */

export const MOTION_MS = {
  press: 140,
  fast: 180,
  base: 220,
  sheet: 280,
  push: 320,
  count: 420,
} as const

export const MOTION_EASE = {
  out: 'cubic-bezier(0.22, 1, 0.36, 1)',
  spring: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
} as const

export const SHEET_DISMISS_RATIO = 0.28
export const SHEET_DISMISS_VELOCITY = 0.55
export const SHEET_RUBBER = 0.32

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Cubic ease-out, t in 0..1. */
export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return 1 - (1 - x) ** 3
}

export function tweenNumber(from: number, to: number, t: number): number {
  return from + (to - from) * easeOutCubic(t)
}

export function rubberBandDown(offsetY: number): number {
  if (offsetY < 0) return offsetY * SHEET_RUBBER
  return offsetY
}

export function settleSheetDismiss({
  offsetY,
  velocityY,
  height,
}: {
  offsetY: number
  velocityY: number
  height: number
}): 'close' | 'stay' {
  const size = Math.max(1, height)
  if (offsetY >= size * SHEET_DISMISS_RATIO) return 'close'
  if (velocityY >= SHEET_DISMISS_VELOCITY) return 'close'
  return 'stay'
}

export function isScrollAtTop(node: HTMLElement | null): boolean {
  if (!node) return true
  if (node.scrollTop > 1) return false
  const nested = node.querySelectorAll<HTMLElement>('.ui-scroll-region-y, .scrollbar-subtle')
  for (const element of nested) {
    if (element.scrollTop > 1) return false
  }
  return true
}
