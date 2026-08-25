/** Follow-finger page-snap carousel (iOS paging / Android ViewPager). */

export const PAGE_SNAP_RATIO = 0.28
export const PAGE_SNAP_VELOCITY = 0.5
export const PAGE_AXIS_LOCK_PX = 12
export const PAGE_RUBBER = 0.32
export const PAGE_SETTLE_MS = 280

export function rubberBandPageOffset(offsetX: number, canPrev: boolean, canNext: boolean): number {
  if (offsetX < 0 && !canNext) return offsetX * PAGE_RUBBER
  if (offsetX > 0 && !canPrev) return offsetX * PAGE_RUBBER
  return offsetX
}

export function lockPageDragAxis(dx: number, dy: number): 'h' | 'v' | null {
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)
  if (absX < PAGE_AXIS_LOCK_PX && absY < PAGE_AXIS_LOCK_PX) return null
  if (absX >= PAGE_AXIS_LOCK_PX && absX > absY * 1.15) return 'h'
  if (absY >= PAGE_AXIS_LOCK_PX && absY > absX) return 'v'
  return null
}

export function settlePageDrag({
  offsetX,
  velocityX,
  width,
  canPrev,
  canNext,
}: {
  offsetX: number
  velocityX: number
  width: number
  canPrev: boolean
  canNext: boolean
}): 'prev' | 'next' | 'stay' {
  const size = Math.max(1, width)
  const distance = Math.abs(offsetX) >= size * PAGE_SNAP_RATIO
  const flickNext = velocityX <= -PAGE_SNAP_VELOCITY
  const flickPrev = velocityX >= PAGE_SNAP_VELOCITY

  if (offsetX < 0 && canNext && (distance || flickNext)) return 'next'
  if (offsetX > 0 && canPrev && (distance || flickPrev)) return 'prev'
  return 'stay'
}
