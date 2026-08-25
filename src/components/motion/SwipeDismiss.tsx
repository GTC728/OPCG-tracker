import { type PointerEvent, type ReactNode, useRef, useState } from 'react'
import { lockPageDragAxis } from '@/lib/pageCarousel'
import { MOTION_MS, prefersReducedMotion, settleSheetDismiss } from '@/lib/motionTokens'

const THRESHOLD = 48

export function SwipeDismiss({
  onDismiss,
  children,
  className,
}: {
  onDismiss: () => void
  children: ReactNode
  className?: string
}) {
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const lastRef = useRef<{ y: number; t: number } | null>(null)
  const axisRef = useRef<'undecided' | 'h' | 'v'>('undecided')
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    startRef.current = { x: event.clientX, y: event.clientY, t: event.timeStamp }
    lastRef.current = { y: event.clientY, t: event.timeStamp }
    axisRef.current = 'undecided'
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (axisRef.current === 'undecided') {
      const locked = lockPageDragAxis(dx, dy)
      if (!locked) return
      axisRef.current = locked
      if (locked === 'v' && dy > 0) {
        event.currentTarget.setPointerCapture(event.pointerId)
        setDragging(true)
      }
    }
    if (axisRef.current !== 'v') return
    lastRef.current = { y: event.clientY, t: event.timeStamp }
    setOffset(Math.max(0, dy))
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    startRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (axisRef.current !== 'v' || !start) {
      axisRef.current = 'undecided'
      setDragging(false)
      setOffset(0)
      return
    }
    axisRef.current = 'undecided'
    setDragging(false)
    const last = lastRef.current
    const flickDt = last ? event.timeStamp - last.t : 0
    const velocityY =
      last && flickDt >= 8
        ? (event.clientY - last.y) / flickDt
        : (event.clientY - start.y) / Math.max(1, event.timeStamp - start.t)
    const offsetY = Math.max(0, event.clientY - start.y)
    if (offsetY >= THRESHOLD || settleSheetDismiss({ offsetY, velocityY, height: 160 }) === 'close') {
      onDismiss()
      return
    }
    setOffset(0)
  }

  return (
    <div
      className={className}
      style={{
        transform: offset ? `translate3d(0, ${offset}px, 0)` : undefined,
        opacity: offset ? Math.max(0.35, 1 - offset / 140) : undefined,
        transition: dragging || prefersReducedMotion() ? 'none' : `transform ${MOTION_MS.fast}ms ease, opacity ${MOTION_MS.fast}ms ease`,
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
