import { useEffect, useState } from 'react'
import type { Match } from '@/types'

export function formatMatchDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function getMatchDurationMs(startedAt: string | null, finishedAt?: string | null): number | null {
  if (!startedAt) return null
  const start = new Date(startedAt).getTime()
  if (Number.isNaN(start)) return null
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
  if (Number.isNaN(end)) return null
  return Math.max(0, end - start)
}

export function getAverageMatchDurationMs(matches: Match[]): number | null {
  const durations = matches
    .map((match) => getMatchDurationMs(match.startedAt, match.finishedAt))
    .filter((duration): duration is number => duration !== null && duration > 0)
  if (durations.length === 0) return null
  return Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length)
}

export function useLiveMatchDuration(startedAt: string | null, active = true): string | null {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!startedAt || !active) return
    const tick = () => setNow(Date.now())
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [startedAt, active])

  if (!startedAt) return null
  const start = new Date(startedAt).getTime()
  if (Number.isNaN(start)) return null
  return formatMatchDuration(now - start)
}
