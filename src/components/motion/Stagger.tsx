import { Children, type ReactNode } from 'react'
import { MOTION_MS, prefersReducedMotion } from '@/lib/motionTokens'

export function Stagger({
  children,
  stepMs = 40,
  className,
}: {
  children: ReactNode
  stepMs?: number
  className?: string
}) {
  const reduce = prefersReducedMotion()

  return (
    <>
      {Children.map(children, (child, index) => (
        <div
          className={[reduce ? '' : 'ui-pop-in', className].filter(Boolean).join(' ')}
          style={
            reduce
              ? undefined
              : { animationDelay: `${Math.min(index, 12) * stepMs}ms`, animationDuration: `${MOTION_MS.base}ms` }
          }
        >
          {child}
        </div>
      ))}
    </>
  )
}
