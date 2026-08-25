import { type PointerEvent, type ReactNode, useRef, useState } from 'react'
import { lockPageDragAxis } from '@/lib/pageCarousel'
import { isScrollAtTop, MOTION_MS, prefersReducedMotion } from '@/lib/motionTokens'

const THRESHOLD = 56

function findScroller(node: HTMLElement | null): HTMLElement | null {
  if (!node) return null
  return node.closest<HTMLElement>('.ui-tab-snap-pane, .ui-scroll-region-y') ?? node.parentElement
}

/** Attach to page content inside an existing vertical scroller (e.g. a TabPager pane). */
export function PullRefresh({
  onRefresh,
  children,
  disabled = false,
  idleLabel = '↓',
  busyLabel = '…',
}: {
  onRefresh: () => void | Promise<void>
  children: ReactNode
  disabled?: boolean
  idleLabel?: string
  busyLabel?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const axisRef = useRef<'undecided' | 'h' | 'v'>('undecided')
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || busy) return
    const scroller = findScroller(event.currentTarget)
    if (scroller && !isScrollAtTop(scroller)) return
    startRef.current = { x: event.clientX, y: event.clientY }
    axisRef.current = 'undecided'
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start || disabled || busy) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (axisRef.current === 'undecided') {
      const locked = lockPageDragAxis(dx, dy)
      if (!locked) return
      axisRef.current = locked
      if (locked === 'v' && dy > 0) event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (axisRef.current !== 'v' || dy < 0) return
    setPull(Math.min(72, dy * 0.45))
  }

  const onPointerUp = async (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const distance = pull
    startRef.current = null
    axisRef.current = 'undecided'
    if (distance < THRESHOLD) {
      setPull(0)
      return
    }
    setBusy(true)
    setPull(48)
    try {
      await onRefresh()
    } finally {
      setBusy(false)
      setPull(0)
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => void onPointerUp(event)}
      onPointerCancel={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
        startRef.current = null
        axisRef.current = 'undecided'
        if (!busy) setPull(0)
      }}
    >
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden text-[11px] text-text-secondary"
        style={{
          height: pull,
          transition: busy || prefersReducedMotion() ? 'none' : `height ${MOTION_MS.fast}ms ease`,
        }}
      >
        {busy ? busyLabel : pull > 8 ? idleLabel : null}
      </div>
      {children}
    </div>
  )
}
