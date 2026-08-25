import { useLayoutEffect, useRef, useState } from 'react'
import { uiSegment, uiSegmentButton } from '@/lib/uiSurface'
import { playInteractionSound } from '@/lib/motion'
import { prefersReducedMotion } from '@/lib/motionTokens'

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
  const trackRef = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState({ left: 3, width: 0 })

  useLayoutEffect(() => {
    const track = trackRef.current
    const active = track?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!track || !active) return
    const t = track.getBoundingClientRect()
    const a = active.getBoundingClientRect()
    setThumb({ left: a.left - t.left, width: a.width })
  }, [value, options.length])

  return (
    <div ref={trackRef} className={[uiSegment, className].filter(Boolean).join(' ')} role="tablist">
      <span
        className="ui-segment-thumb"
        style={{
          left: thumb.left,
          width: thumb.width,
          transition: prefersReducedMotion() ? 'none' : undefined,
        }}
        aria-hidden
      />
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
