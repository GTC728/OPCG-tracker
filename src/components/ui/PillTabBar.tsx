import { playInteractionSound, uiPressable } from '@/lib/motion'

export function PillTabBar<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  return (
    <div className={['flex flex-wrap gap-2', className].filter(Boolean).join(' ')}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            className={[active ? 'ui-pill-tab ui-pill-tab--active' : 'ui-pill-tab', uiPressable].join(' ')}
            onClick={() => {
              playInteractionSound('tap')
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
