import { type ReactNode, useEffect } from 'react'

interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="關閉"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="safe-bottom relative z-10 max-h-[85vh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-surface-elevated shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-muted px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-muted"
            onClick={onClose}
          >
            取消
          </button>
        </div>
        <div className="max-h-[calc(85vh-4rem)] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
