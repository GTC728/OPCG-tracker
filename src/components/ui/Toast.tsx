import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  actionLabel?: string
  onAction?: () => void
  durationMs?: number
  onDismiss: () => void
}

export function Toast({
  message,
  actionLabel,
  onAction,
  durationMs = 5000,
  onDismiss,
}: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false)
      onDismiss()
    }, durationMs)

    return () => window.clearTimeout(timer)
  }, [durationMs, onDismiss])

  if (!visible) return null

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
      <div className="flex max-w-md items-center gap-3 rounded-2xl bg-surface-elevated px-4 py-3 shadow-xl ring-1 ring-surface-muted">
        <p className="flex-1 text-sm">{message}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => {
              onAction()
              setVisible(false)
              onDismiss()
            }}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}
