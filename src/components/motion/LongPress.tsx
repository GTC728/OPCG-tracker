import { type PointerEvent, type ReactNode, useEffect, useRef } from 'react'

const DELAY_MS = 480
const MOVE_CANCEL_PX = 12

export function LongPress({
  onLongPress,
  children,
  disabled = false,
  className,
}: {
  onLongPress: () => void
  children: ReactNode
  disabled?: boolean
  className?: string
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const firedRef = useRef(false)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      if (!suppressClickRef.current) return
      event.preventDefault()
      event.stopPropagation()
      suppressClickRef.current = false
    }
    document.addEventListener('click', onClickCapture, true)
    return () => document.removeEventListener('click', onClickCapture, true)
  }, [])

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return
    firedRef.current = false
    startRef.current = { x: event.clientX, y: event.clientY }
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      firedRef.current = true
      suppressClickRef.current = true
      onLongPress()
    }, DELAY_MS)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start || !timerRef.current) return
    if (Math.abs(event.clientX - start.x) > MOVE_CANCEL_PX || Math.abs(event.clientY - start.y) > MOVE_CANCEL_PX) {
      clearTimer()
    }
  }

  const onPointerUp = () => {
    startRef.current = null
    clearTimer()
  }

  return (
    <div
      className={className}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(event) => {
        if (disabled) return
        event.preventDefault()
        suppressClickRef.current = true
        onLongPress()
      }}
    >
      {children}
    </div>
  )
}
