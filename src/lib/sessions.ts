import { createId, nowIso } from '@/lib/utils'
import type { Session } from '@/types'

export function getSessionDateLabel(date = new Date()): string {
  return date.toLocaleDateString('zh-Hant', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function createSessionName(date = new Date()): string {
  return `${getSessionDateLabel(date)} 卡店`
}

export function createSession(name = createSessionName()): Session {
  const createdAt = nowIso()

  return {
    id: createId(),
    name,
    startedAt: createdAt,
    endedAt: null,
    createdAt,
  }
}

export function isSameLocalDate(leftIso: string, right = new Date()): boolean {
  const left = new Date(leftIso)

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

export function findOpenSessionForToday(sessions: Session[], date = new Date()): Session | null {
  return (
    sessions.find(
      (session) => session.endedAt === null && isSameLocalDate(session.startedAt, date),
    ) ?? null
  )
}
