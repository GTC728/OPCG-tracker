import { useEffect, useRef } from 'react'

const SHAKE_THRESHOLD = 22
const COOLDOWN_MS = 1400

/**
 * Device-motion shake detector. Not wired to undo — too easy to misfire at a table.
 */
export function useShakeGesture(onShake: () => void, enabled = false) {
  const onShakeRef = useRef(onShake)
  onShakeRef.current = onShake
  const lastRef = useRef(0)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const onMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity
      if (!acc) return
      const magnitude = Math.abs(acc.x ?? 0) + Math.abs(acc.y ?? 0) + Math.abs(acc.z ?? 0)
      if (magnitude < SHAKE_THRESHOLD) return
      const now = Date.now()
      if (now - lastRef.current < COOLDOWN_MS) return
      lastRef.current = now
      onShakeRef.current()
    }

    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [enabled])
}
