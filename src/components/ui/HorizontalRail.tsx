import type { ReactNode } from 'react'
import { useHorizontalWheelScroll } from '@/hooks/useWheelScroll'
import { uiHorizontalRail } from '@/lib/uiSurface'

export function HorizontalRail({ className = '', children }: { className?: string; children: ReactNode }) {
  const ref = useHorizontalWheelScroll<HTMLDivElement>()
  return (
    <div ref={ref} className={[uiHorizontalRail, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
