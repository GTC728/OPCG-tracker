import { useState } from 'react'
import { selectPickerOptionClass } from '@/lib/selectSurface'
import { BottomSheet } from '@/components/ui/BottomSheet'

export function FilterPickerRow({
  label,
  value,
  placeholder,
  onClick,
}: {
  label: string
  value: string
  placeholder: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-xl bg-surface px-3 py-2.5 text-left ring-1 ring-surface-muted outline-none transition active:scale-[0.99]"
      onClick={onClick}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-text-secondary">{label}</span>
        <span className={['mt-0.5 block truncate text-sm', value ? 'font-semibold text-text-primary' : 'text-text-secondary'].join(' ')}>
          {value || placeholder}
        </span>
      </span>
      <span className="shrink-0 text-sm text-text-secondary" aria-hidden>
        ›
      </span>
    </button>
  )
}

export function FilterChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              className={[
                'rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none transition',
                active
                  ? 'bg-brand-600 text-white ring-1 ring-brand-400'
                  : 'bg-surface text-text-primary ring-1 ring-surface-muted',
              ].join(' ')}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function OptionPickerSheet({
  open,
  title,
  options,
  value,
  allLabel,
  onChange,
  onClose,
}: {
  open: boolean
  title: string
  options: Array<{ value: string; label: string }>
  value: string
  allLabel: string
  onChange: (value: string) => void
  onClose: () => void
}) {
  return (
    <BottomSheet open={open} title={title} onClose={onClose}>
      <div className="max-h-[min(60dvh,20rem)] space-y-1 overflow-y-auto">
        <button
          type="button"
          className={selectPickerOptionClass(!value)}
          onClick={() => {
            onChange('')
            onClose()
          }}
        >
          {allLabel}
        </button>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={selectPickerOptionClass(value === option.value)}
            onClick={() => {
              onChange(option.value)
              onClose()
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}

const inputClass =
  'min-h-10 w-full rounded-xl border border-surface-muted bg-surface px-3 text-sm text-text-primary outline-none focus:border-brand-500'

export function DateRangeFilter({
  presetLabel,
  presetOptions,
  preset,
  onPresetChange,
  fromLabel,
  toLabel,
  from,
  to,
  onFromChange,
  onToChange,
}: {
  presetLabel: string
  presetOptions: Array<{ value: string; label: string }>
  preset: string
  onPresetChange: (value: string) => void
  fromLabel: string
  toLabel: string
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
}) {
  const custom = preset === 'custom'

  return (
    <div className="space-y-2">
      <FilterChipRow label={presetLabel} options={presetOptions} value={preset} onChange={onPresetChange} />
      {custom ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">{fromLabel}</span>
            <input type="date" className={`mt-1 ${inputClass}`} value={from} onChange={(event) => onFromChange(event.target.value)} />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">{toLabel}</span>
            <input type="date" className={`mt-1 ${inputClass}`} value={to} onChange={(event) => onToChange(event.target.value)} />
          </label>
        </div>
      ) : null}
    </div>
  )
}

export function useFilterSheet() {
  const [openKey, setOpenKey] = useState<string | null>(null)
  return {
    openKey,
    open: (key: string) => setOpenKey(key),
    close: () => setOpenKey(null),
    isOpen: (key: string) => openKey === key,
  }
}
