import { uiSegment, uiSegmentButton } from '@/lib/uiSurface'
import { playInteractionSound } from '@/lib/motion'

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={[uiSegment, className].filter(Boolean).join(' ')} role="tablist">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={uiSegmentButton(active)}
            onClick={() => {
              playInteractionSound('toggle')
              onChange(option.value)
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
