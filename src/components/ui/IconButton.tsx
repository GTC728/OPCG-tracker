import { useCallback, useRef, useState, type ReactNode } from 'react'
import { playInteractionSound, uiPressable } from '@/lib/motion'

interface IconButtonProps {
  label: string
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'danger' | 'brand'
  className?: string
  children: ReactNode
}

const variantClass: Record<NonNullable<IconButtonProps['variant']>, string> = {
  default: 'text-text-secondary hover:bg-surface-muted hover:text-text-primary',
  danger: 'text-danger hover:bg-danger/10',
  brand: 'text-brand-300 hover:bg-brand-500/15',
}

export function IconButton({
  label,
  onClick,
  disabled = false,
  variant = 'default',
  className = '',
  children,
}: IconButtonProps) {
  const [showHint, setShowHint] = useState(false)
  const holdTimerRef = useRef<number | null>(null)

  const clearHold = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }, [])

  const handlePointerDown = () => {
    clearHold()
    holdTimerRef.current = window.setTimeout(() => setShowHint(true), 420)
  }

  const handlePointerUp = () => {
    clearHold()
    window.setTimeout(() => setShowHint(false), 1200)
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => {
        if (disabled) return
        playInteractionSound('tap')
        onClick?.()
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        clearHold()
        setShowHint(false)
      }}
      onPointerCancel={() => {
        clearHold()
        setShowHint(false)
      }}
      className={[
        'relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition disabled:opacity-40',
        uiPressable,
        variantClass[variant],
        className,
      ].join(' ')}
    >
      {children}
      {showHint ? (
        <span className="pointer-events-none absolute -top-9 left-1/2 z-20 max-w-[10rem] -translate-x-1/2 whitespace-nowrap rounded-md bg-surface-elevated px-2 py-1 text-[10px] font-medium text-text-primary shadow-lg ring-1 ring-surface-muted">
          {label}
        </span>
      ) : null}
    </button>
  )
}

interface TabIconButtonProps {
  label: string
  active?: boolean
  onClick?: () => void
  children: ReactNode
}

export function TabIconButton({ label, active = false, onClick, children }: TabIconButtonProps) {
  const [showHint, setShowHint] = useState(false)
  const holdTimerRef = useRef<number | null>(null)

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        playInteractionSound('tap')
        onClick?.()
      }}
      onPointerDown={() => {
        holdTimerRef.current = window.setTimeout(() => setShowHint(true), 420)
      }}
      onPointerUp={() => {
        if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current)
        window.setTimeout(() => setShowHint(false), 1200)
      }}
      onPointerLeave={() => {
        if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current)
        setShowHint(false)
      }}
      className={[
        'relative flex h-9 min-w-9 flex-1 items-center justify-center rounded-lg transition',
        uiPressable,
        active ? 'bg-brand-500 text-white' : 'bg-surface text-text-secondary ring-1 ring-surface-muted',
      ].join(' ')}
    >
      {children}
      {showHint ? (
        <span className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-surface-elevated px-2 py-1 text-[10px] font-medium text-text-primary shadow-lg ring-1 ring-surface-muted">
          {label}
        </span>
      ) : null}
    </button>
  )
}
