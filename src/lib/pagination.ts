export const DEFAULT_PAGE_SIZE = 10

export function getPageCount(totalItems: number, pageSize: number): number {
  const size = Math.max(1, pageSize)
  return Math.max(1, Math.ceil(Math.max(0, totalItems) / size))
}

export function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) return 1
  return Math.min(Math.max(1, totalPages), Math.max(1, Math.trunc(page)))
}

export function slicePage<T>(items: T[], page: number, pageSize: number): T[] {
  const size = Math.max(1, pageSize)
  const totalPages = getPageCount(items.length, size)
  const safePage = clampPage(page, totalPages)
  const start = (safePage - 1) * size
  return items.slice(start, start + size)
}

/** Compact window of page numbers around the current page. */
export function visiblePageWindow(current: number, total: number, maxButtons = 5): number[] {
  if (total <= maxButtons) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }
  const half = Math.floor(maxButtons / 2)
  let start = Math.max(1, current - half)
  let end = start + maxButtons - 1
  if (end > total) {
    end = total
    start = Math.max(1, end - maxButtons + 1)
  }
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}
