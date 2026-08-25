import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type TransitionEvent,
} from 'react'
import {
  isNestedHorizontalGestureTarget,
  lockPageDragAxis,
  PAGE_SETTLE_MS,
  rubberBandPageOffset,
  settlePageDrag,
} from '@/lib/pageCarousel'
import { prefersReducedMotion } from '@/lib/motionTokens'
import { PullRefresh } from '@/components/motion/PullRefresh'

type AxisLock = 'undecided' | 'h' | 'v'

export function TabPager<T extends string>({
  tabs,
  active,
  onChange,
  render,
  onRefresh,
  refreshIdleLabel,
  refreshBusyLabel,
}: {
  tabs: readonly T[]
  active: T
  onChange: (tab: T) => void
  render: (tab: T) => ReactNode
  onRefresh?: () => void | Promise<void>
  refreshIdleLabel?: string
  refreshBusyLabel?: string
}) {
  const [displayed, setDisplayed] = useState(active)
  const [mounted, setMounted] = useState(() => new Set<T>([active]))
  const [shift, setShift] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [instant, setInstant] = useState(false)
  const [incoming, setIncoming] = useState<T | null>(null)

  const viewportRef = useRef<HTMLDivElement>(null)
  const axisRef = useRef<AxisLock>('undecided')
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const lastMoveRef = useRef<{ x: number; t: number } | null>(null)
  const pendingRef = useRef<T | null>(null)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressClickRef = useRef(false)
  const committedRef = useRef(active)

  const indexOf = (tab: T) => tabs.indexOf(tab)
  const displayedIndex = indexOf(displayed)
  const canPrev = displayedIndex > 0
  const canNext = displayedIndex >= 0 && displayedIndex < tabs.length - 1
  const prevTab = incoming && indexOf(incoming) < displayedIndex ? incoming : tabs[displayedIndex - 1]
  const nextTab = incoming && indexOf(incoming) > displayedIndex ? incoming : tabs[displayedIndex + 1]

  useEffect(() => {
    const index = indexOf(active)
    setMounted((current) => {
      const next = new Set(current)
      next.add(active)
      if (index > 0) next.add(tabs[index - 1] as T)
      if (index >= 0 && index < tabs.length - 1) next.add(tabs[index + 1] as T)
      return next
    })
  }, [active, tabs])

  useLayoutEffect(() => {
    if (!instant) return
    setInstant(false)
  }, [instant, displayed])

  useEffect(() => {
    const node = viewportRef.current
    if (!node) return
    const onTouchMove = (event: TouchEvent) => {
      if (axisRef.current === 'h') event.preventDefault()
    }
    node.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => node.removeEventListener('touchmove', onTouchMove)
  }, [])

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

  useEffect(() => {
    return () => {
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current)
    }
  }, [])

  const paneTransition = dragging || instant ? 'none' : `transform ${PAGE_SETTLE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`

  const commit = (target: T) => {
    pendingRef.current = null
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current)
      settleTimerRef.current = null
    }
    setIncoming(null)
    setInstant(true)
    setDragging(false)
    setDisplayed(target)
    setShift(0)
    committedRef.current = target
    if (target !== active) onChange(target)
  }

  const armCommit = (target: T, toShift: number) => {
    pendingRef.current = target
    setMounted((current) => new Set(current).add(target))
    setIncoming(target)
    setDragging(false)
    setInstant(false)
    setShift(toShift)
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current)
    settleTimerRef.current = window.setTimeout(() => {
      if (pendingRef.current === target) commit(target)
    }, PAGE_SETTLE_MS + 60)
  }

  const goTo = (target: T) => {
    if (target === displayed && !pendingRef.current) return
    if (prefersReducedMotion()) {
      commit(target)
      return
    }
    const width = viewportRef.current?.getBoundingClientRect().width ?? 0
    if (width < 8) {
      commit(target)
      return
    }
    const dir = indexOf(target) > displayedIndex ? 1 : -1
    armCommit(target, -dir * width)
  }

  useEffect(() => {
    if (active === committedRef.current) return
    goTo(active)
  }, [active])

  const onPaneTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== 'transform') return
    if (event.target !== event.currentTarget) return
    const pending = pendingRef.current
    if (!pending) return
    commit(pending)
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (pendingRef.current) return
    if (isNestedHorizontalGestureTarget(event.target)) return
    axisRef.current = 'undecided'
    startRef.current = { x: event.clientX, y: event.clientY, t: event.timeStamp }
    lastMoveRef.current = { x: event.clientX, t: event.timeStamp }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (axisRef.current === 'undecided') {
      const locked = lockPageDragAxis(dx, dy)
      if (!locked) return
      axisRef.current = locked
      if (locked === 'v') return
      event.currentTarget.setPointerCapture(event.pointerId)
      setDragging(true)
    }
    if (axisRef.current !== 'h') return
    const previous = lastMoveRef.current
    lastMoveRef.current = { x: event.clientX, t: event.timeStamp }
    if (previous && event.timeStamp === previous.t) return
    setShift(rubberBandPageOffset(dx, canPrev, canNext))
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = startRef.current
    startRef.current = null
    if (!start) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (axisRef.current !== 'h') {
      axisRef.current = 'undecided'
      return
    }
    axisRef.current = 'undecided'
    const width = event.currentTarget.getBoundingClientRect().width
    const last = lastMoveRef.current
    const flickDt = last ? event.timeStamp - last.t : 0
    const velocityX =
      last && flickDt >= 8
        ? (event.clientX - last.x) / flickDt
        : (event.clientX - start.x) / Math.max(1, event.timeStamp - start.t)
    const offsetX = rubberBandPageOffset(event.clientX - start.x, canPrev, canNext)
    if (Math.abs(event.clientX - start.x) > 8) suppressClickRef.current = true

    const decision = settlePageDrag({ offsetX, velocityX, width, canPrev, canNext })
    if (prefersReducedMotion()) {
      setDragging(false)
      if (decision === 'next' && canNext) commit(tabs[displayedIndex + 1] as T)
      else if (decision === 'prev' && canPrev) commit(tabs[displayedIndex - 1] as T)
      else setShift(0)
      return
    }

    setDragging(false)
    if (decision === 'next' && canNext) {
      armCommit(tabs[displayedIndex + 1] as T, -width)
      return
    }
    if (decision === 'prev' && canPrev) {
      armCommit(tabs[displayedIndex - 1] as T, width)
      return
    }
    setShift(0)
  }

  const paneClass =
    'ui-tab-snap-pane scrollbar-subtle absolute inset-0 overflow-y-auto overscroll-y-contain app-main-bottom-pad'

  return (
    <div
      ref={viewportRef}
      className={['ui-tab-snap relative min-h-0 flex-1 overflow-hidden', dragging ? 'select-none' : ''].join(' ')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {tabs.map((tab) => {
        if (!mounted.has(tab)) return null
        const isCurrent = tab === displayed
        const isPrev = Boolean(prevTab && tab === prevTab && canPrev)
        const isNext = Boolean(nextTab && tab === nextTab && canNext)
        if (!isCurrent && !isPrev && !isNext) {
          return (
            <div key={tab} className="hidden" aria-hidden>
              {render(tab)}
            </div>
          )
        }
        const x = isCurrent
          ? `${shift}px`
          : isPrev
            ? `calc(-100% + ${shift}px)`
            : `calc(100% + ${shift}px)`
        return (
          <div
            key={tab}
            className={[paneClass, isCurrent ? 'z-[1]' : 'ui-tab-snap-pane--side z-0'].join(' ')}
            style={{ transform: `translate3d(${x}, 0, 0)`, transition: paneTransition }}
            aria-hidden={!isCurrent}
            onTransitionEnd={isCurrent ? onPaneTransitionEnd : undefined}
          >
            <PullRefresh
              disabled={!onRefresh}
              onRefresh={onRefresh ?? (() => undefined)}
              idleLabel={refreshIdleLabel}
              busyLabel={refreshBusyLabel}
            >
              {render(tab)}
            </PullRefresh>
          </div>
        )
      })}
    </div>
  )
}
