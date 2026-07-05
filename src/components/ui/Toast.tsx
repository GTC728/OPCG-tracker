import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  message: string
  actionLabel?: string
  onAction?: () => void
  durationMs?: number
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

interface ToastProps {
  type?: ToastType
  message: string
  actionLabel?: string
  onAction?: () => void
  durationMs?: number
  onDismiss: () => void
}

export function Toast({
  type = 'info',
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

  const toneClasses: Record<ToastType, string> = {
    success: 'border-success/40 bg-green-950/90 text-green-50',
    error: 'border-danger/50 bg-red-950/90 text-red-50',
    info: 'border-surface-muted bg-surface-elevated text-text-primary',
  }

  return (
    <div className="app-above-bottom-chrome fixed inset-x-0 z-40 flex justify-center px-4">
      <div className={['flex max-w-md items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl', toneClasses[type]].join(' ')}>
        <p className="flex-1 text-sm">{message}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition active:scale-95"
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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    setToasts((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        ...toast,
      },
    ])
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message) => showToast({ type: 'success', message }),
      error: (message) => showToast({ type: 'error', message }),
      info: (message) => showToast({ type: 'info', message }),
    }),
    [showToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.slice(-3).map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          durationMs={toast.durationMs}
          onDismiss={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
        />
      ))}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) {
    throw new Error('useToast must be used inside ToastProvider')
  }
  return value
}
