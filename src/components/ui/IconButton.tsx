import type { ReactNode } from 'react'

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
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition disabled:opacity-40',
        variantClass[variant],
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}
