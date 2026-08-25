export function FloatingSidePager({
  canPrev,
  canNext,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
}: {
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  prevLabel: string
  nextLabel: string
}) {
  const buttonClass =
    'absolute top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--glass-bg-solid)] text-base font-semibold text-text-secondary shadow-[var(--glass-shadow)] ring-1 ring-[var(--ui-border)] backdrop-blur-md outline-none disabled:pointer-events-none disabled:opacity-25'

  return (
    <>
      <button
        type="button"
        className={[buttonClass, 'left-1'].join(' ')}
        disabled={!canPrev}
        aria-label={prevLabel}
        onClick={onPrev}
      >
        ‹
      </button>
      <button
        type="button"
        className={[buttonClass, 'right-1'].join(' ')}
        disabled={!canNext}
        aria-label={nextLabel}
        onClick={onNext}
      >
        ›
      </button>
    </>
  )
}
