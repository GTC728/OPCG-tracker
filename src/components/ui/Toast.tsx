import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SwipeDismiss } from '@/components/motion/SwipeDismiss'
import { usePresence } from '@/components/motion/usePresence'
import { MOTION_MS } from '@/lib/motionTokens'

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
  const [open, setOpen] = useState(true)
  const mounted = usePresence(open, MOTION_MS.base)
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(false), durationMs)
    return () => window.clearTimeout(timer)
  }, [durationMs])

  useEffect(() => {
    if (!open && !mounted) onDismissRef.current()
  }, [open, mounted])

  if (!mounted) return null

  const toneClasses: Record<ToastType, string> = {
    success: 'border-success/40',
    error: 'border-danger/50',
    info: 'border-[var(--glass-border)]',
  }

  return (
    <div className="app-above-bottom-chrome fixed inset-x-0 z-40 flex justify-center px-4">
      <SwipeDismiss onDismiss={() => setOpen(false)}>
        <div
          className={[
            'ui-frost flex max-w-md items-center gap-3 rounded-2xl border px-4 py-3 text-text-primary',
            open ? 'ui-slide-up' : 'ui-slide-down',
            toneClasses[type],
          ].join(' ')}
        >
          <p className="flex-1 text-sm">{message}</p>
          {actionLabel && onAction ? (
            <button
              type="button"
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition active:scale-95"
              onClick={() => {
                onAction()
                setOpen(false)
              }}
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      </SwipeDismiss>
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
      <div className="h-full min-h-0">{children}</div>
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
