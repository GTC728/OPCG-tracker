import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type TransitionEvent,
} from 'react'
import { FloatingSidePager } from '@/components/ui/FloatingSidePager'
import { useI18n } from '@/lib/i18n'
import {
  lockPageDragAxis,
  PAGE_SETTLE_MS,
  rubberBandPageOffset,
  settlePageDrag,
} from '@/lib/pageCarousel'
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  getPageCount,
  slicePage,
  visiblePageWindow,
} from '@/lib/pagination'

type AxisLock = 'undecided' | 'h' | 'v'

export function PagedList<T>({
  items,
  pageSize = DEFAULT_PAGE_SIZE,
  renderItem,
  getItemKey,
  empty,
  className,
}: {
  items: T[]
  pageSize?: number
  renderItem: (item: T, index: number) => ReactNode
  getItemKey: (item: T, index: number) => string
  empty?: ReactNode
  className?: string
}) {
  const { t } = useI18n()
  const [page, setPage] = useState(1)
  const [draft, setDraft] = useState('1')
  const [shift, setShift] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [instant, setInstant] = useState(false)
  const [incomingPage, setIncomingPage] = useState<number | null>(null)

  const viewportRef = useRef<HTMLDivElement>(null)
  const currentPaneRef = useRef<HTMLDivElement>(null)
  const axisRef = useRef<AxisLock>('undecided')
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const lastMoveRef = useRef<{ x: number; t: number } | null>(null)
  const pendingRef = useRef<{ page: number } | null>(null)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressClickRef = useRef(false)

  const totalPages = getPageCount(items.length, pageSize)
  const safePage = clampPage(page, totalPages)
  const canPrev = safePage > 1
  const canNext = safePage < totalPages
  const prevPage = incomingPage != null && incomingPage < safePage ? incomingPage : safePage - 1
  const nextPage = incomingPage != null && incomingPage > safePage ? incomingPage : safePage + 1

  useEffect(() => {
    setPage((current) => clampPage(current, getPageCount(items.length, pageSize)))
    setShift(0)
    setIncomingPage(null)
  }, [items.length, pageSize])

  useEffect(() => {
    setDraft(String(safePage))
    currentPaneRef.current?.scrollTo({ top: 0 })
  }, [safePage])

  useLayoutEffect(() => {
    if (!instant) return
    setInstant(false)
  }, [instant, page])

  useEffect(() => {
    const node = viewportRef.current
    if (!node) return
    const onTouchMove = (event: TouchEvent) => {
      if (axisRef.current === 'h') event.preventDefault()
    }
    node.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => node.removeEventListener('touchmove', onTouchMove)
  }, [totalPages])

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

  const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const paneTransition = dragging || instant ? 'none' : `transform ${PAGE_SETTLE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`

  const renderPage = (pageNumber: number) => {
    const rows = slicePage(items, pageNumber, pageSize)
    const offset = (pageNumber - 1) * Math.max(1, pageSize)
    return rows.map((item, index) => (
      <div key={getItemKey(item, offset + index)}>{renderItem(item, offset + index)}</div>
    ))
  }

  const commitPage = (target: number) => {
    pendingRef.current = null
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current)
      settleTimerRef.current = null
    }
    setIncomingPage(null)
    setInstant(true)
    setDragging(false)
    setPage(clampPage(target, totalPages))
    setShift(0)
  }

  const armCommit = (target: number, toShift: number) => {
    pendingRef.current = { page: target }
    setIncomingPage(target)
    setDragging(false)
    setInstant(false)
    setShift(toShift)
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current)
    settleTimerRef.current = window.setTimeout(() => {
      if (pendingRef.current?.page === target) commitPage(target)
    }, PAGE_SETTLE_MS + 60)
  }

  const goTo = (next: number) => {
    const target = clampPage(next, totalPages)
    if (target === safePage) return
    if (pendingRef.current) return
    if (prefersReducedMotion()) {
      commitPage(target)
      return
    }
    const width = viewportRef.current?.getBoundingClientRect().width ?? 0
    if (width < 8) {
      commitPage(target)
      return
    }
    const dir = target > safePage ? 1 : -1
    armCommit(target, -dir * width)
  }

  const onPaneTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== 'transform') return
    if (event.target !== event.currentTarget) return
    const pending = pendingRef.current
    if (!pending) return
    commitPage(pending.page)
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (pendingRef.current) return
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

    if (prefersReducedMotion()) {
      const decision = settlePageDrag({ offsetX, velocityX, width, canPrev, canNext })
      setDragging(false)
      if (decision === 'next') commitPage(safePage + 1)
      else if (decision === 'prev') commitPage(safePage - 1)
      else setShift(0)
      return
    }

    const decision = settlePageDrag({ offsetX, velocityX, width, canPrev, canNext })
    setDragging(false)
    if (decision === 'next') {
      armCommit(safePage + 1, -width)
      return
    }
    if (decision === 'prev') {
      armCommit(safePage - 1, width)
      return
    }
    setShift(0)
  }

  if (!items.length) {
    return <>{empty}</>
  }

  return (
    <div className={['flex min-h-0 flex-1 flex-col gap-3', className].filter(Boolean).join(' ')}>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={viewportRef}
          className={[
            'ui-page-snap relative flex min-h-0 min-h-[12rem] min-w-0 flex-1 flex-col overflow-hidden',
            dragging ? 'select-none' : '',
          ].join(' ')}
          onPointerDown={totalPages > 1 ? onPointerDown : undefined}
          onPointerMove={totalPages > 1 ? onPointerMove : undefined}
          onPointerUp={totalPages > 1 ? onPointerUp : undefined}
          onPointerCancel={totalPages > 1 ? onPointerUp : undefined}
        >
          {totalPages > 1 && canPrev ? (
            <div
              className="ui-page-snap-pane ui-page-snap-pane--side scrollbar-subtle space-y-2 overflow-y-auto"
              style={{
                transform: `translate3d(calc(-100% + ${shift}px), 0, 0)`,
                transition: paneTransition,
              }}
              aria-hidden
            >
              {renderPage(prevPage)}
            </div>
          ) : null}
          <div
            ref={currentPaneRef}
            className="ui-page-snap-pane scrollbar-subtle relative min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto"
            style={{
              transform: `translate3d(${shift}px, 0, 0)`,
              transition: paneTransition,
            }}
            onTransitionEnd={onPaneTransitionEnd}
          >
            {renderPage(safePage)}
          </div>
          {totalPages > 1 && canNext ? (
            <div
              className="ui-page-snap-pane ui-page-snap-pane--side scrollbar-subtle space-y-2 overflow-y-auto"
              style={{
                transform: `translate3d(calc(100% + ${shift}px), 0, 0)`,
                transition: paneTransition,
              }}
              aria-hidden
            >
              {renderPage(nextPage)}
            </div>
          ) : null}
        </div>
        {totalPages > 1 ? (
          <FloatingSidePager
            canPrev={canPrev}
            canNext={canNext}
            onPrev={() => goTo(safePage - 1)}
            onNext={() => goTo(safePage + 1)}
            prevLabel={t('common.previous')}
            nextLabel={t('common.next')}
          />
        ) : null}
      </div>

      {totalPages > 1 ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const parsed = Number.parseInt(draft, 10)
            goTo(Number.isFinite(parsed) ? parsed : safePage)
          }}
        >
          <div className="flex min-w-0 flex-1 flex-wrap gap-1">
            {visiblePageWindow(safePage, totalPages).map((number) => (
              <button
                key={number}
                type="button"
                className={[
                  'min-h-8 min-w-8 rounded-lg px-2 text-xs font-semibold tabular-nums outline-none',
                  number === safePage
                    ? 'bg-brand-600 text-white'
                    : 'bg-[var(--glass-inset-bg)] text-text-secondary',
                ].join(' ')}
                aria-current={number === safePage ? 'page' : undefined}
                onClick={() => goTo(number)}
              >
                {number}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="sr-only">{t('pagination.goToPage')}</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              inputMode="numeric"
              className="h-8 w-12 rounded-lg border border-[var(--ui-border)] bg-surface px-1 text-center text-xs tabular-nums text-text-primary outline-none"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label={t('pagination.goToPage')}
            />
            <span className="tabular-nums">
              / {totalPages}
            </span>
            <button
              type="submit"
              className="min-h-8 rounded-lg bg-[var(--glass-inset-bg)] px-2 text-xs font-semibold text-text-secondary"
            >
              {t('pagination.jump')}
            </button>
          </label>
        </form>
      ) : null}
    </div>
  )
}
