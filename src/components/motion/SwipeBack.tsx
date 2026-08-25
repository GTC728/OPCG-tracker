import { type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import {
  isNestedHorizontalGestureTarget,
  lockPageDragAxis,
  PAGE_SETTLE_MS,
  settlePageDrag,
} from '@/lib/pageCarousel'
import { prefersReducedMotion } from '@/lib/motionTokens'

type AxisLock = 'undecided' | 'h' | 'v' | 'pass'

/** iOS interactive pop: drag right to go back. Leftward pans are left for tab swipe. */
export function SwipeBack({
  onBack,
  children,
  className,
}: {
  onBack: () => void
  children: ReactNode
  className?: string
}) {
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const lastRef = useRef<{ x: number; t: number } | null>(null)
  const axisRef = useRef<AxisLock>('undecided')
  const pendingRef = useRef(false)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [shift, setShift] = useState(0)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current)
    }
  }, [])

  const commitBack = () => {
    pendingRef.current = false
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current)
      settleTimerRef.current = null
    }
    setDragging(false)
    setShift(0)
    onBack()
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (pendingRef.current) return
    if (isNestedHorizontalGestureTarget(event.target)) return
    axisRef.current = 'undecided'
    startRef.current = { x: event.clientX, y: event.clientY, t: event.timeStamp }
    lastRef.current = { x: event.clientX, t: event.timeStamp }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start || axisRef.current === 'pass') return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (axisRef.current === 'undecided') {
      const locked = lockPageDragAxis(dx, dy)
      if (!locked) return
      if (locked === 'v' || dx <= 0) {
        axisRef.current = 'pass'
        return
      }
      axisRef.current = 'h'
      event.currentTarget.setPointerCapture(event.pointerId)
      setDragging(true)
    }
    if (axisRef.current !== 'h') return
    event.stopPropagation()
    lastRef.current = { x: event.clientX, t: event.timeStamp }
    setShift(Math.max(0, dx))
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    startRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (axisRef.current !== 'h' || !start) {
      axisRef.current = 'undecided'
      return
    }
    axisRef.current = 'undecided'
    event.stopPropagation()
    const width = event.currentTarget.getBoundingClientRect().width
    const last = lastRef.current
    const flickDt = last ? event.timeStamp - last.t : 0
    const velocityX =
      last && flickDt >= 8
        ? (event.clientX - last.x) / flickDt
        : (event.clientX - start.x) / Math.max(1, event.timeStamp - start.t)
    const offsetX = Math.max(0, event.clientX - start.x)
    const decision = settlePageDrag({
      offsetX,
      velocityX,
      width,
      canPrev: true,
      canNext: false,
    })

    if (prefersReducedMotion() || width < 8) {
      setDragging(false)
      if (decision === 'prev') commitBack()
      else setShift(0)
      return
    }

    setDragging(false)
    if (decision === 'prev') {
      pendingRef.current = true
      setShift(width)
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current)
      settleTimerRef.current = window.setTimeout(commitBack, PAGE_SETTLE_MS)
      return
    }
    setShift(0)
  }

  return (
    <div
      className={className}
      style={{
        transform: shift ? `translate3d(${shift}px, 0, 0)` : undefined,
        transition: dragging ? 'none' : `transform ${PAGE_SETTLE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children}
    </div>
  )
}
