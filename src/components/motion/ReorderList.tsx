import { type PointerEvent, type ReactNode, useRef, useState } from 'react'
import { moveItem } from '@/lib/reorder'
import { MOTION_MS, prefersReducedMotion } from '@/lib/motionTokens'

/**
 * Drag-to-reorder a vertical list. Not for numbered live tables (slot identity is the table number).
 */
export function ReorderList<T>({
  items,
  getKey,
  onReorder,
  renderItem,
  disabled = false,
}: {
  items: T[]
  getKey: (item: T, index: number) => string
  onReorder: (next: T[]) => void
  renderItem: (item: T, index: number) => ReactNode
  disabled?: boolean
}) {
  const startRef = useRef<{ y: number; index: number } | null>(null)
  const [from, setFrom] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)

  const onPointerDown = (index: number, event: PointerEvent<HTMLButtonElement>) => {
    if (disabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
    startRef.current = { y: event.clientY, index }
    setFrom(index)
    setHover(index)
  }

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const start = startRef.current
    if (start == null || from == null) return
    const row = event.currentTarget.parentElement
    const height = row?.getBoundingClientRect().height ?? 48
    const delta = Math.round((event.clientY - start.y) / Math.max(24, height * 0.6))
    setHover(Math.min(items.length - 1, Math.max(0, start.index + delta)))
  }

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (from != null && hover != null && from !== hover) {
      onReorder(moveItem(items, from, hover))
    }
    startRef.current = null
    setFrom(null)
    setHover(null)
  }

  return (
    <ul className="space-y-2" data-no-tab-swipe>
      {items.map((item, index) => (
        <li
          key={getKey(item, index)}
          className="flex items-stretch gap-2"
          style={{
            opacity: from === index ? 0.65 : 1,
            transform: hover === index && from !== null && from !== index ? 'translateY(-2px)' : undefined,
            transition: prefersReducedMotion() ? 'none' : `opacity ${MOTION_MS.fast}ms ease`,
          }}
        >
          <button
            type="button"
            className="flex w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary ring-1 ring-surface-muted"
            aria-label="Reorder"
            disabled={disabled}
            onPointerDown={(event) => onPointerDown(index, event)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            ⋮⋮
          </button>
          <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
        </li>
      ))}
    </ul>
  )
}
