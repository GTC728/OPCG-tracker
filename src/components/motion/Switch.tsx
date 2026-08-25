import { playInteractionSound } from '@/lib/motion'

export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={['ui-switch', checked ? 'ui-switch--on' : ''].filter(Boolean).join(' ')}
      onClick={() => {
        playInteractionSound('toggle')
        onChange(!checked)
      }}
    >
      <span className="ui-switch-knob" aria-hidden />
    </button>
  )
}
