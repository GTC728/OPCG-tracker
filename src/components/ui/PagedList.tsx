import { useEffect, useRef, useState, type ReactNode, type TouchEvent, type WheelEvent } from 'react'
import { FloatingSidePager } from '@/components/ui/FloatingSidePager'
import { useI18n } from '@/lib/i18n'
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  getPageCount,
  slicePage,
  visiblePageWindow,
} from '@/lib/pagination'

const SWIPE_THRESHOLD = 48

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
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const totalPages = getPageCount(items.length, pageSize)
  const safePage = clampPage(page, totalPages)
  const pageItems = slicePage(items, safePage, pageSize)
  const offset = (safePage - 1) * Math.max(1, pageSize)

  useEffect(() => {
    setPage((current) => clampPage(current, getPageCount(items.length, pageSize)))
  }, [items.length, pageSize])

  useEffect(() => {
    setDraft(String(safePage))
    listRef.current?.scrollTo({ top: 0 })
  }, [safePage])

  const goTo = (next: number) => {
    setPage(clampPage(next, totalPages))
  }

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    const el = event.currentTarget
    const atTop = el.scrollTop <= 0
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
    if (event.deltaY > 24 && atBottom && safePage < totalPages) {
      goTo(safePage + 1)
    } else if (event.deltaY < -24 && atTop && safePage > 1) {
      goTo(safePage - 1)
    }
  }

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null
  }

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const end = event.changedTouches[0]
    if (!end) return
    const deltaX = start.x - end.clientX
    const deltaY = start.y - end.clientY
    const el = listRef.current
    const atTop = !el || el.scrollTop <= 0
    const atBottom = !el || el.scrollTop + el.clientHeight >= el.scrollHeight - 1
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX > 0) goTo(safePage + 1)
      else goTo(safePage - 1)
      return
    }
    if (deltaY > SWIPE_THRESHOLD && atBottom) goTo(safePage + 1)
    if (deltaY < -SWIPE_THRESHOLD && atTop) goTo(safePage - 1)
  }

  if (!items.length) {
    return <>{empty}</>
  }

  return (
    <div className={['flex min-h-0 flex-1 flex-col gap-3', className].filter(Boolean).join(' ')}>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={listRef}
          className="min-h-[12rem] min-w-0 flex-1 space-y-2 overflow-y-auto"
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {pageItems.map((item, index) => (
            <div key={getItemKey(item, offset + index)}>{renderItem(item, offset + index)}</div>
          ))}
        </div>
        {totalPages > 1 ? (
          <FloatingSidePager
            canPrev={safePage > 1}
            canNext={safePage < totalPages}
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
