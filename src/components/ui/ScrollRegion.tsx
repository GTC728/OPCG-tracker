import type { CSSProperties, ReactNode } from 'react'
import { useHorizontalWheelScroll } from '@/hooks/useWheelScroll'

type Axis = 'x' | 'y' | 'both'

const axisClass: Record<Axis, string> = {
  x: 'overflow-x-auto overflow-y-hidden ui-scroll-region-x',
  y: 'overflow-y-auto overflow-x-hidden ui-scroll-region-y',
  both: 'overflow-auto ui-scroll-region-y ui-scroll-region-x',
}

export function ScrollRegion({
  axis = 'y',
  className = '',
  style,
  children,
}: {
  axis?: Axis
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const horizontalRef = useHorizontalWheelScroll<HTMLDivElement>()
  const useHorizontalWheel = axis === 'x' || axis === 'both'

  return (
    <div
      ref={useHorizontalWheel ? horizontalRef : undefined}
      style={style}
      className={[axisClass[axis], className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  )
}
