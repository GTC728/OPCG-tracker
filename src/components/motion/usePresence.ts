import { useEffect, useState } from 'react'
import { MOTION_MS, prefersReducedMotion } from '@/lib/motionTokens'

/** Keep children mounted through the exit duration so CSS can play. */
export function usePresence(open: boolean, durationMs: number = MOTION_MS.sheet): boolean {
  const [mounted, setMounted] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    if (prefersReducedMotion()) {
      setMounted(false)
      return
    }
    const id = window.setTimeout(() => setMounted(false), durationMs)
    return () => window.clearTimeout(id)
  }, [open, durationMs])

  return mounted
}
