import { cloneElement, isValidElement, type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useHistoryBack } from '@/components/motion/useHistoryBack'
import { lockPageDragAxis } from '@/lib/pageCarousel'
import { MOTION_MS, prefersReducedMotion } from '@/lib/motionTokens'
import { useI18n } from '@/lib/i18n'

const MIN_PINCH = 1.08
const MAX_SCALE = 3.2

/**
 * Double-tap / pinch to inspect. Do not wrap Recharts — gesture fight.
 */
export function Zoomable({
  children,
  disabled = false,
  className,
}: {
  children: ReactNode
  disabled?: boolean
  className?: string
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const lastTapRef = useRef(0)
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

  const close = () => {
    setOpen(false)
    setScale(1)
    setPan({ x: 0, y: 0 })
    pinchRef.current = null
    dragRef.current = null
  }

  useHistoryBack(open, close)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const toggleZoom = () => {
    if (scale > 1.15) {
      setScale(1)
      setPan({ x: 0, y: 0 })
      return
    }
    setScale(2.2)
  }

  const onTriggerPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()]
      const dx = pts[0]!.x - pts[1]!.x
      const dy = pts[0]!.y - pts[1]!.y
      pinchRef.current = { distance: Math.hypot(dx, dy), scale: 1 }
    }
  }

  const onTriggerPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointersRef.current.size !== 2 || !pinchRef.current) return
    const pts = [...pointersRef.current.values()]
    const distance = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y)
    if (distance / pinchRef.current.distance >= MIN_PINCH) {
      setOpen(true)
      setScale(Math.min(MAX_SCALE, Math.max(1, distance / pinchRef.current.distance)))
    }
  }

  const onTriggerPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId)
    pinchRef.current = null
    if (disabled || (event.pointerType === 'touch' && pointersRef.current.size > 0)) return
    const now = event.timeStamp
    if (now - lastTapRef.current < 280) {
      lastTapRef.current = 0
      setOpen(true)
      setScale(2.2)
      return
    }
    lastTapRef.current = now
  }

  const onStagePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointersRef.current.size === 1) {
      dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
    }
    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()]
      pinchRef.current = {
        distance: Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y),
        scale,
      }
      dragRef.current = null
    }
  }

  const onStagePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()]
      const distance = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y)
      setScale(Math.min(MAX_SCALE, Math.max(1, pinchRef.current.scale * (distance / Math.max(1, pinchRef.current.distance)))))
      return
    }
    const drag = dragRef.current
    if (!drag || scale <= 1.05) {
      if (drag) {
        const dy = event.clientY - drag.y
        const dx = event.clientX - drag.x
        if (lockPageDragAxis(dx, dy) === 'v' && dy > 48) close()
      }
      return
    }
    setPan({
      x: drag.panX + event.clientX - drag.x,
      y: drag.panY + event.clientY - drag.y,
    })
  }

  const onStagePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId)
    pinchRef.current = null
    dragRef.current = null
  }

  return (
    <>
      <div
        data-no-tab-swipe
        className={className}
        onPointerDown={onTriggerPointerDown}
        onPointerMove={onTriggerPointerMove}
        onPointerUp={onTriggerPointerUp}
        onPointerCancel={onTriggerPointerUp}
        onDoubleClick={(event) => {
          if (disabled) return
          event.preventDefault()
          event.stopPropagation()
          setOpen(true)
          setScale(2.2)
        }}
      >
        {children}
      </div>
      {open
        ? createPortal(
            <div
              className="ui-zoom-lightbox"
              data-no-tab-swipe
              onPointerDown={onStagePointerDown}
              onPointerMove={onStagePointerMove}
              onPointerUp={onStagePointerUp}
              onPointerCancel={onStagePointerUp}
              onDoubleClick={toggleZoom}
            >
              <button type="button" className="ui-zoom-lightbox__close" onClick={close}>
                {t('motion.zoomClose')}
              </button>
              <div
                className="ui-zoom-lightbox__stage"
                style={{
                  transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
                  transition: prefersReducedMotion() ? 'none' : `transform ${MOTION_MS.fast}ms ease`,
                }}
              >
                {isValidElement(children) ? cloneElement(children) : children}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
