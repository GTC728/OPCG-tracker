import { type ReactNode, useEffect, useRef } from 'react'
import { SwipeBack } from '@/components/motion/SwipeBack'
import { useHistoryBack } from '@/components/motion/useHistoryBack'
import { isBlockingOverlayOpen } from '@/lib/historyBack'

/** iOS-style push: new screen slides in from the right. Optional `onBack` enables drag-right to pop. */
export function PushStage({
  children,
  className,
  onBack,
}: {
  children: ReactNode
  className?: string
  onBack?: () => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  useHistoryBack(Boolean(onBack), onBack ?? (() => {}), hostRef)

  useEffect(() => {
    if (!onBack) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (isBlockingOverlayOpen()) return
      onBack()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onBack])

  const inner = (
    <div ref={hostRef} className={['ui-motion-push-in', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
  if (!onBack) return inner
  return <SwipeBack onBack={onBack}>{inner}</SwipeBack>
}
