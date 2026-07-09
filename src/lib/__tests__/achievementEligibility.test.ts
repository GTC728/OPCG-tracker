import { describe, expect, it } from 'vitest'
import {
  computePlayerMatchEligibility,
  MIN_ACHIEVEMENT_GAP_MS,
  MIN_ACHIEVEMENT_MATCH_MS,
  SESSION_ACHIEVEMENT_CAP_PER_PLAYER,
} from '@/lib/achievementEligibility'
import type { Match } from '@/types'

function match(partial: Partial<Match> & Pick<Match, 'id' | 'sessionId' | 'finishedAt'>): Match {
  return {
    matchNumber: 1,
    player1Id: 'p1',
    player2Id: 'p2',
    deck1Id: 'd1',
    deck2Id: 'd2',
    winnerPlayerId: 'p1',
    winnerDeckId: 'd1',
    firstPlayerId: 'p1',
    resultType: 'normal',
    startedAt: partial.finishedAt,
    source: 'manual',
    deletedAt: null,
    notes: null,
    ...partial,
  }
}

describe('achievementEligibility', () => {
  it('rejects import source and forfeit', () => {
    const base = new Date('2026-01-01T12:00:00Z')
    const end = new Date(base.getTime() + MIN_ACHIEVEMENT_MATCH_MS + 1000).toISOString()
    const rows = [
      match({ id: 'm1', sessionId: 's1', finishedAt: end, startedAt: base.toISOString(), source: 'import' }),
      match({
        id: 'm2',
        sessionId: 's1',
        finishedAt: end,
        startedAt: base.toISOString(),
        resultType: 'forfeit',
      }),
    ]
    const map = computePlayerMatchEligibility('p1', rows)
    expect(map.get('m1')).toBe('import_source')
    expect(map.get('m2')).toBe('forfeit')
  })

  it('rejects matches shorter than 5 minutes', () => {
    const start = '2026-01-01T12:00:00Z'
    const end = new Date(new Date(start).getTime() + 60_000).toISOString()
    const rows = [match({ id: 'm1', sessionId: 's1', finishedAt: end, startedAt: start })]
    expect(computePlayerMatchEligibility('p1', rows).get('m1')).toBe('too_short')
  })

  it('rejects overlapping consecutive matches', () => {
    const t0 = new Date('2026-01-01T12:00:00Z')
    const t1 = new Date(t0.getTime() + MIN_ACHIEVEMENT_MATCH_MS + 1000)
    const t2 = new Date(t1.getTime() + 60_000)
    const t3 = new Date(t2.getTime() + MIN_ACHIEVEMENT_MATCH_MS + 1000)
    const rows = [
      match({
        id: 'm1',
        sessionId: 's1',
        startedAt: t0.toISOString(),
        finishedAt: t1.toISOString(),
      }),
      match({
        id: 'm2',
        sessionId: 's1',
        startedAt: t2.toISOString(),
        finishedAt: t3.toISOString(),
      }),
    ]
    const map = computePlayerMatchEligibility('p1', rows)
    expect(map.get('m1')).toBe('ok')
    expect(map.get('m2')).toBe('overlap_gap')
  })

  it('caps eligible matches per session at 20', () => {
    const rows: Match[] = []
    let cursor = new Date('2026-01-01T10:00:00Z')
    for (let index = 0; index < SESSION_ACHIEVEMENT_CAP_PER_PLAYER + 2; index += 1) {
      const start = cursor
      const end = new Date(start.getTime() + MIN_ACHIEVEMENT_MATCH_MS + 1000)
      rows.push(
        match({
          id: `m${index}`,
          sessionId: 's1',
          startedAt: start.toISOString(),
          finishedAt: end.toISOString(),
        }),
      )
      cursor = new Date(end.getTime() + MIN_ACHIEVEMENT_GAP_MS + 1000)
    }
    const map = computePlayerMatchEligibility('p1', rows)
    expect(map.get('m19')).toBe('ok')
    expect(map.get('m20')).toBe('session_cap')
    expect(map.get('m21')).toBe('session_cap')
  })

  it('restore source counts when rules pass', () => {
    const start = '2026-01-01T12:00:00Z'
    const end = new Date(new Date(start).getTime() + MIN_ACHIEVEMENT_MATCH_MS + 1000).toISOString()
    const rows = [
      match({ id: 'm1', sessionId: 's1', finishedAt: end, startedAt: start, source: 'restore' }),
    ]
    expect(computePlayerMatchEligibility('p1', rows).get('m1')).toBe('ok')
  })
})
