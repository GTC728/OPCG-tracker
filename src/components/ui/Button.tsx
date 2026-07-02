import { type ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  fullWidth?: boolean
  loading?: boolean
  loadingLabel?: string
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700 active:bg-brand-700',
  secondary: 'bg-surface-muted text-text-primary hover:bg-slate-500 active:bg-slate-600',
  ghost: 'bg-transparent text-text-secondary ring-1 ring-surface-muted hover:bg-surface-elevated hover:text-text-primary',
  danger: 'bg-danger text-white shadow-lg shadow-red-900/20 hover:bg-red-600 active:bg-red-700',
  success: 'bg-success text-white shadow-lg shadow-green-900/20 hover:bg-green-600 active:bg-green-700',
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  disabled,
  loading = false,
  loadingLabel,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      className={[
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-semibold',
        'transition duration-150 ease-out active:scale-[0.98]',
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
      {...props}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : null}
      {loading ? (loadingLabel ?? children) : children}
    </button>
  )
}
