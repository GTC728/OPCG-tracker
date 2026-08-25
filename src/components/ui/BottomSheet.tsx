import { type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useHistoryBack } from '@/components/motion/useHistoryBack'
import { usePresence } from '@/components/motion/usePresence'
import { uiPressable } from '@/lib/motion'
import {
  MOTION_MS,
  isScrollAtTop,
  prefersReducedMotion,
  rubberBandDown,
  settleSheetDismiss,
} from '@/lib/motionTokens'
import { lockPageDragAxis } from '@/lib/pageCarousel'

interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** When true, panel body does not scroll — child manages its own scroll region. */
  manageScroll?: boolean
}

export function BottomSheet({ open, title, onClose, children, manageScroll = false }: BottomSheetProps) {
  const mounted = usePresence(open, MOTION_MS.sheet)
  useHistoryBack(open, onClose)
  const panelRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const lastRef = useRef<{ y: number; t: number } | null>(null)
  const axisRef = useRef<'undecided' | 'h' | 'v'>('undecided')
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (open) {
      setDragY(0)
      setDragging(false)
      setHeld(false)
    }
  }, [open])

  useEffect(() => {
    if (!mounted) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [mounted, onClose])

  useEffect(() => {
    const node = panelRef.current
    if (!node) return
    const onTouchMove = (event: TouchEvent) => {
      if (axisRef.current === 'v' && dragging) event.preventDefault()
    }
    node.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => node.removeEventListener('touchmove', onTouchMove)
  }, [dragging, mounted])

  if (!mounted) return null

  const closing = !open
  const reduce = prefersReducedMotion()
  const liftStyle =
    dragging || dragY
      ? {
          transform: `translate3d(0, ${dragY}px, 0)`,
          transition: dragging || reduce ? 'none' : `transform ${MOTION_MS.sheet}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }
      : undefined

  const onHandlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (closing) return
    startRef.current = { x: event.clientX, y: event.clientY }
    lastRef.current = { y: event.clientY, t: event.timeStamp }
    axisRef.current = 'undecided'
  }

  const onHandlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (axisRef.current === 'undecided') {
      const locked = lockPageDragAxis(dx, dy)
      if (!locked) return
      axisRef.current = locked
      if (locked === 'v') {
        event.currentTarget.setPointerCapture(event.pointerId)
        setDragging(true)
      }
    }
    if (axisRef.current !== 'v') return
    lastRef.current = { y: event.clientY, t: event.timeStamp }
    setDragY(rubberBandDown(dy))
  }

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    startRef.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (axisRef.current !== 'v') {
      axisRef.current = 'undecided'
      return
    }
    axisRef.current = 'undecided'
    setDragging(false)
    const height = panelRef.current?.getBoundingClientRect().height ?? 1
    const last = lastRef.current
    const flickDt = last ? event.timeStamp - last.t : 0
    const velocityY =
      last && flickDt >= 8
        ? (event.clientY - last.y) / flickDt
        : start
          ? (event.clientY - start.y) / Math.max(1, event.timeStamp - (last?.t ?? event.timeStamp))
          : 0
    const offsetY = rubberBandDown(start ? event.clientY - start.y : dragY)
    if (settleSheetDismiss({ offsetY, velocityY, height }) === 'close') {
      setHeld(true)
      setDragY(reduce ? height : Math.max(offsetY, height))
      onClose()
      return
    }
    setDragY(0)
  }

  const onBodyPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!isScrollAtTop(bodyRef.current)) return
    onHandlePointerDown(event)
  }

  return createPortal(
    <div
      className={[
        'ui-sheet-root fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4',
        closing ? 'ui-sheet-root--out' : 'ui-sheet-root--in',
        held || (closing && dragY > 8) ? 'ui-sheet-root--held' : '',
      ].join(' ')}
    >
      <button
        type="button"
        aria-label="關閉"
        className="ui-sheet-backdrop absolute inset-0"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={[
          'ui-sheet-panel safe-bottom relative flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl',
          'max-h-[min(calc(100dvh-var(--bottom-chrome-height,4.5rem)-0.5rem),88dvh)] sm:max-h-[min(88dvh,720px)]',
        ].join(' ')}
        style={liftStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
      >
        <div className="ui-sheet-frost" aria-hidden />
        <div className="ui-sheet-panel-body relative z-[1] flex min-h-0 flex-1 flex-col">
          <div
            className="flex shrink-0 flex-col"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
          >
            <div className="flex justify-center pt-2 sm:hidden" aria-hidden>
              <span className="ui-sheet-grab" />
            </div>
            <div className="flex items-center justify-between border-b border-[var(--ui-border)] bg-transparent px-5 py-3.5">
              <h2 id="bottom-sheet-title" className="text-lg font-semibold">
                {title}
              </h2>
              <button
                type="button"
                className={[uiPressable, 'rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-muted'].join(
                  ' ',
                )}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={onClose}
              >
                取消
              </button>
            </div>
          </div>
          <div
            ref={bodyRef}
            className={
              manageScroll
                ? 'flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4'
                : 'scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-5 py-4'
            }
            onPointerDown={onBodyPointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
          >
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
