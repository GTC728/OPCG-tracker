import { useEffect, useRef, useState } from 'react'
import { getHistoryBackStack, isInHiddenTabPane } from '@/lib/historyBack'

/**
 * While `active` is true, browser / Android back calls `onBack` instead of leaving the PWA.
 * Hidden TabPager panes do not capture back (all tabs stay mounted).
 */
export function useHistoryBack(active: boolean, onBack: () => void, hostRef?: { current: Element | null }) {
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack
  const [paneHidden, setPaneHidden] = useState(false)

  useEffect(() => {
    const node = hostRef?.current ?? null
    const pane = node?.closest('.ui-tab-snap-pane') ?? null
    if (!pane) {
      setPaneHidden(false)
      return
    }
    const sync = () => setPaneHidden(pane.getAttribute('aria-hidden') === 'true')
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(pane, { attributes: true, attributeFilter: ['aria-hidden'] })
    return () => observer.disconnect()
  }, [active, hostRef])

  useEffect(() => {
    if (!active || paneHidden) return
    if (isInHiddenTabPane(hostRef?.current ?? null)) return

    const stack = getHistoryBackStack()
    const id = stack.activate(() => onBackRef.current())
    return () => stack.deactivate(id)
  }, [active, paneHidden, hostRef])
}
