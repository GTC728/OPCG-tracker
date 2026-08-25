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
  return (
    <>
      <button
        type="button"
        className="ui-floating-pager-btn ui-floating-pager-btn--prev"
        disabled={!canPrev}
        aria-label={prevLabel}
        onClick={onPrev}
      >
        ‹
      </button>
      <button
        type="button"
        className="ui-floating-pager-btn ui-floating-pager-btn--next"
        disabled={!canNext}
        aria-label={nextLabel}
        onClick={onNext}
      >
        ›
      </button>
    </>
  )
}
