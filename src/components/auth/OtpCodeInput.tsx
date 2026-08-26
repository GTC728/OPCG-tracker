import { useEffect, useRef } from 'react'
import { EMAIL_OTP_LENGTH } from '@/lib/constants'
import { playInteractionSound } from '@/lib/motion'

export function OtpCodeInput({
  value,
  onChange,
  disabled = false,
  label,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  label: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const digits = value.padEnd(EMAIL_OTP_LENGTH, ' ').split('').slice(0, EMAIL_OTP_LENGTH)

  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled])

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <button
        type="button"
        className="relative w-full"
        disabled={disabled}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="grid grid-cols-8 gap-1.5 sm:gap-2">
          {digits.map((digit, index) => (
            <div
              key={index}
              className={[
                'flex h-11 items-center justify-center rounded-xl border bg-surface text-lg font-bold tabular-nums',
                digit.trim()
                  ? 'border-brand-500/40 text-text-primary ring-1 ring-brand-500/20'
                  : 'border-[var(--ui-border)] text-text-secondary',
              ].join(' ')}
            >
              {digit.trim() || '·'}
            </div>
          ))}
        </div>
        <input
          ref={inputRef}
          className="absolute inset-0 cursor-text opacity-0"
          inputMode="numeric"
          autoComplete="one-time-code"
          disabled={disabled}
          value={value}
          onChange={(event) => {
            const next = event.target.value.replace(/\D/g, '').slice(0, EMAIL_OTP_LENGTH)
            onChange(next)
          }}
          onFocus={() => playInteractionSound('tap')}
        />
      </button>
    </div>
  )
}
