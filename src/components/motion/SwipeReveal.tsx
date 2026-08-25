import { type ReactNode, useRef, useState, type PointerEvent } from 'react'
import { lockPageDragAxis } from '@/lib/pageCarousel'
import { MOTION_MS, prefersReducedMotion } from '@/lib/motionTokens'

const REVEAL_WIDTH = 88

export function SwipeReveal({
  children,
  action,
  onAction,
  disabled = false,
}: {
  children: ReactNode
  action: ReactNode
  onAction: () => void
  disabled?: boolean
}) {
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const axisRef = useRef<'undecided' | 'h' | 'v'>('undecided')
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    startRef.current = { x: event.clientX, y: event.clientY }
    axisRef.current = 'undecided'
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start || disabled) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (axisRef.current === 'undecided') {
      const locked = lockPageDragAxis(dx, dy)
      if (!locked) return
      axisRef.current = locked
      if (locked === 'h') {
        event.stopPropagation()
        event.currentTarget.setPointerCapture(event.pointerId)
        setDragging(true)
      }
    }
    if (axisRef.current !== 'h') return
    setOffset(Math.min(0, Math.max(-REVEAL_WIDTH, dx)))
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    startRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (axisRef.current !== 'h') {
      axisRef.current = 'undecided'
      setDragging(false)
      return
    }
    axisRef.current = 'undecided'
    setDragging(false)
    setOffset((current) => (current < -REVEAL_WIDTH * 0.45 ? -REVEAL_WIDTH : 0))
  }

  return (
    <div className="ui-swipe-reveal relative overflow-hidden rounded-2xl" data-no-tab-swipe>
      <div className="absolute inset-y-0 right-0 flex w-[88px] items-stretch">
        <button
          type="button"
          className="flex w-full items-center justify-center bg-danger text-xs font-semibold text-white"
          onClick={onAction}
        >
          {action}
        </button>
      </div>
      <div
        className="relative"
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          transition: dragging || prefersReducedMotion() ? 'none' : `transform ${MOTION_MS.base}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          onPointerMove(event)
          if (axisRef.current === 'h') event.stopPropagation()
        }}
        onPointerUp={(event) => {
          if (axisRef.current === 'h') event.stopPropagation()
          onPointerUp(event)
        }}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
    </div>
  )
}
