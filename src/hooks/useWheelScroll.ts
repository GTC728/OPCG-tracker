import { useEffect, useRef, type RefObject } from 'react'

/** On desktop, map vertical wheel to horizontal scroll when content overflows. */
export function useHorizontalWheelScroll<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const onWheel = (event: WheelEvent) => {
      if (element.scrollWidth <= element.clientWidth) return
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      element.scrollLeft += event.deltaY
      event.preventDefault()
    }

    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [])

  return ref
}
