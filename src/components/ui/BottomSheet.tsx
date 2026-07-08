import { type ReactNode, useEffect } from 'react'

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-start sm:overflow-y-auto sm:p-3 sm:pt-4">
      <button
        type="button"
        aria-label="關閉"
        className="ui-sheet-backdrop fixed inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        className={[
          'ui-sheet-panel safe-bottom relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface-elevated shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl',
          manageScroll ? 'max-h-[92dvh]' : 'max-h-[92dvh] sm:max-h-[calc(100dvh-2rem)]',
        ].join(' ')}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-surface-muted px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
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
              : 'scrollbar-subtle max-h-[calc(92dvh-4.5rem)] overflow-y-auto px-5 py-4 sm:max-h-[calc(100dvh-6rem)]'
          }
        >
          {children}
        </div>
      </div>
    </div>
  )
}
