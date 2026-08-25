import { type CSSProperties, type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import { MOTION_MS, prefersReducedMotion } from '@/lib/motionTokens'

export function Collapse({
  open,
  children,
  className,
}: {
  open: boolean
  children: ReactNode
  className?: string
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  const seenRef = useRef(false)
  const [height, setHeight] = useState<number | 'auto'>(open ? 'auto' : 0)

  useLayoutEffect(() => {
    const node = innerRef.current
    if (!node) return

    if (!seenRef.current) {
      seenRef.current = true
      setHeight(open ? 'auto' : 0)
      return
    }

    if (prefersReducedMotion()) {
      setHeight(open ? 'auto' : 0)
      return
    }

    if (open) {
      setHeight(node.scrollHeight)
      const id = window.setTimeout(() => setHeight('auto'), MOTION_MS.sheet)
      return () => window.clearTimeout(id)
    }

    setHeight(node.scrollHeight)
    const frame = window.requestAnimationFrame(() => setHeight(0))
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  const style: CSSProperties = {
    height: height === 'auto' ? 'auto' : height,
    overflow: 'hidden',
    transition: prefersReducedMotion() ? 'none' : `height ${MOTION_MS.sheet}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  }

  return (
    <div className={className} style={style} aria-hidden={!open}>
      <div ref={innerRef}>{children}</div>
    </div>
  )
}
