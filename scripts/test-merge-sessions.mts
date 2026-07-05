/**
 * Smoke tests for mergeSessionsState. Run: npx tsx scripts/test-merge-sessions.mts
 */
import assert from 'node:assert/strict'
import { createDefaultAppState } from '../src/lib/constants.ts'
import { createSession, mergeSessionsState } from '../src/lib/sessions.ts'
import { createId, nowIso } from '../src/lib/utils.ts'
import type { Match } from '../src/types/index.ts'

function makeMatch(sessionId: string, matchNumber: number, finishedAt: string): Match {
  return {
    id: createId(),
    sessionId,
    matchNumber,
    player1Id: 'p1',
    deck1Id: 'd1',
    player2Id: 'p2',
    deck2Id: 'd2',
    winnerPlayerId: 'p1',
    winnerDeckId: 'd1',
    firstPlayerId: 'p1',
    resultType: 'normal',
    startedAt: finishedAt,
    finishedAt,
    notes: null,
    source: 'manual',
    deletedAt: null,
  }
}

const source = createSession('來源場')
const target = createSession('保留場')
const base = createDefaultAppState()
base.sessions = [source, target]
base.currentSessionId = source.id
base.matches = [
  makeMatch(source.id, 1, '2026-07-01T10:00:00.000Z'),
  makeMatch(source.id, 2, '2026-07-01T11:00:00.000Z'),
  makeMatch(target.id, 1, '2026-07-01T09:00:00.000Z'),
]
base.sessionPlayers = [
  { sessionId: source.id, playerId: 'p1', defaultDeckVariantId: null },
  { sessionId: target.id, playerId: 'p2', defaultDeckVariantId: null },
]
base.settings.sessionTableCounts = { [source.id]: 4, [target.id]: 2 }

const merged = mergeSessionsState(base, source.id, target.id)

assert.equal(merged.currentSessionId, target.id)
assert.ok(merged.sessions.find((s) => s.id === source.id)?.deletedAt)
assert.equal(merged.matches.filter((m) => m.sessionId === target.id && !m.deletedAt).length, 3)
assert.equal(merged.matches.filter((m) => m.sessionId === source.id && !m.deletedAt).length, 0)
assert.deepEqual(
  merged.matches
    .filter((m) => m.sessionId === target.id && !m.deletedAt)
    .map((m) => m.matchNumber)
    .sort((a, b) => a - b),
  [1, 2, 3],
)
assert.equal(merged.sessionPlayers.filter((r) => r.sessionId === target.id).length, 2)
assert.equal(merged.settings.sessionTableCounts[target.id], 4)
assert.equal(merged.settings.sessionTableCounts[source.id], undefined)

assert.throws(() => mergeSessionsState(base, source.id, source.id))

console.log('mergeSessionsState: all assertions passed')
