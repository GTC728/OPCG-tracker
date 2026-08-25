import { useEffect, useRef } from 'react'
import { isBlockingOverlayOpen, isTypingTarget } from '@/lib/historyBack'

export type HotkeyBinding = {
  key: string
  handler: () => void
  enabled?: boolean
  /** Skip while a bottom sheet is open. Default true. */
  ignoreSheet?: boolean
}

export function useHotkeys(bindings: HotkeyBinding[]) {
  const bindingsRef = useRef(bindings)
  bindingsRef.current = bindings

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      for (const binding of bindingsRef.current) {
        if (binding.enabled === false) continue
        if (event.key !== binding.key) continue
        if ((binding.ignoreSheet ?? true) && isBlockingOverlayOpen()) return
        event.preventDefault()
        binding.handler()
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
