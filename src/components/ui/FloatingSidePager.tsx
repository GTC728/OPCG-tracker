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
    'absolute top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/15 text-white/65 ring-1 ring-white/12 backdrop-blur-[1px] outline-none transition hover:bg-black/30 hover:text-white disabled:pointer-events-none disabled:opacity-20'

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
