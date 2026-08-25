import { useEffect, useRef, useState } from 'react'
import { MOTION_MS, prefersReducedMotion, tweenNumber } from '@/lib/motionTokens'

export function CountUp({
  value,
  className,
  format,
}: {
  value: number
  className?: string
  format?: (value: number) => string
}) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const firstRef = useRef(true)

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false
      fromRef.current = value
      setDisplay(value)
      return
    }
    if (prefersReducedMotion() || fromRef.current === value) {
      fromRef.current = value
      setDisplay(value)
      return
    }
    const from = fromRef.current
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / MOTION_MS.count)
      setDisplay(tweenNumber(from, value, t))
      if (t < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        fromRef.current = value
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  const rounded = Number.isInteger(value) ? Math.round(display) : display
  const text = format ? format(rounded) : String(rounded)

  return (
    <span className={['tabular-nums', className].filter(Boolean).join(' ')}>{text}</span>
  )
}
