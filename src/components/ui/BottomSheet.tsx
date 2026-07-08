import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** When true, panel body does not scroll — child manages its own scroll region. */
  manageScroll?: boolean
}

export function BottomSheet({ open, title, onClose, children, manageScroll = false }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="ui-sheet-root fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="關閉"
        className="ui-sheet-backdrop absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        className={[
          'ui-sheet-panel safe-bottom relative flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface-elevated shadow-2xl sm:rounded-2xl',
          'max-h-[min(calc(100dvh-var(--bottom-chrome-height,4.5rem)-0.5rem),88dvh)] sm:max-h-[min(88dvh,720px)]',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-surface-muted px-5 py-3.5">
          <h2 id="bottom-sheet-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-muted"
            onClick={onClose}
          >
            取消
          </button>
        </div>
        <div
          className={
            manageScroll
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4'
              : 'scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-5 py-4'
          }
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
