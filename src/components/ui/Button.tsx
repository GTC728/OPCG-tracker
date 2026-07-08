import { type ButtonHTMLAttributes } from 'react'
import { playInteractionSound, uiPressable } from '@/lib/motion'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  fullWidth?: boolean
  loading?: boolean
  loadingLabel?: string
  silent?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-[0_4px_14px_color-mix(in_srgb,var(--color-brand-600)_35%,transparent)] hover:bg-brand-700 active:bg-brand-700',
  secondary:
    'bg-surface-elevated text-text-primary border border-[var(--ui-border)] hover:bg-surface-muted/50 active:bg-surface-muted/70',
  ghost:
    'bg-transparent text-text-secondary border border-[var(--ui-border)] hover:bg-surface-elevated hover:text-text-primary',
  danger: 'bg-danger text-white shadow-[0_4px_14px_rgba(239,68,68,0.25)] hover:bg-red-600 active:bg-red-700',
  success:
    'bg-success text-white shadow-[0_4px_14px_rgba(34,197,94,0.25)] hover:bg-green-600 active:bg-green-700',
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  disabled,
  loading = false,
  loadingLabel,
  silent = false,
  children,
  onPointerDown,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      className={[
        'inline-flex min-h-[var(--ui-btn-min-h)] items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-semibold',
        uiPressable,
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        variantClasses[variant],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={isDisabled}
      aria-busy={loading}
      onPointerDown={(event) => {
        if (!silent && !isDisabled) playInteractionSound('tap')
        onPointerDown?.(event)
      }}
      {...props}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : null}
      {loading ? (loadingLabel ?? children) : children}
    </button>
  )
}
