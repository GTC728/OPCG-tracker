import { describe, expect, it } from 'vitest'
import { createDefaultAppState } from '@/lib/constants'
import { mergeAchievementUnlocks } from '@/lib/achievements'
import {
  importRowFingerprint,
  partitionImportRows,
  matchFingerprint,
} from '@/lib/importDedup'
import type { ImportMatchInput, Match } from '@/types'

describe('importDedup', () => {
  const row: ImportMatchInput = {
    date: '2026-06-19',
    player1Name: 'Alice',
    player2Name: 'Bob',
    deck1Query: 'OP01',
    deck2Query: 'OP02',
    winnerName: 'Alice',
    firstPlayerName: null,
    notes: null,
  }

  it('detects duplicate import rows', () => {
    const existing = new Set([importRowFingerprint(row)])
    const result = partitionImportRows([row, row], existing)
    expect(result.unique).toHaveLength(0)
    expect(result.duplicateCount).toBe(2)
  })

  it('builds match fingerprint from state', () => {
    const state = createDefaultAppState()
    const match: Match = {
      id: 'm1',
      sessionId: 's1',
      matchNumber: 1,
      player1Id: 'p1',
      deck1Id: state.decks[0]!.id,
      player2Id: 'p2',
      deck2Id: state.decks[1]!.id,
      winnerPlayerId: 'p1',
      winnerDeckId: state.decks[0]!.id,
      firstPlayerId: null,
      resultType: 'normal',
      startedAt: '2026-06-19T10:00:00.000Z',
      finishedAt: '2026-06-19T10:30:00.000Z',
      source: 'historical',
      deletedAt: null,
      notes: null,
    }
    const players = [
      { id: 'p1', name: 'Alice', aliases: [], archived: false, deletedAt: null, profileClaimDeviceId: null, profileClaimedAt: null, linkedUserId: null, createdAt: '', updatedAt: '' },
      { id: 'p2', name: 'Bob', aliases: [], archived: false, deletedAt: null, profileClaimDeviceId: null, profileClaimedAt: null, linkedUserId: null, createdAt: '', updatedAt: '' },
    ]
    const fp = matchFingerprint(match, players, state.decks)
    expect(fp).toContain('alice')
    expect(fp).toContain('bob')
  })
})

describe('mergeAchievementUnlocks', () => {
  it('keeps higher level on conflict', () => {
    const base = [{
      achievementId: 'veteran',
      playerId: 'p1',
      profileIdentityId: 'prof1',
      level: 2,
      unlockedAt: '2026-01-01T00:00:00.000Z',
    }]
    const incoming = [{
      achievementId: 'veteran',
      playerId: 'p1',
      profileIdentityId: 'prof1',
      level: 3,
      unlockedAt: '2026-02-01T00:00:00.000Z',
    }]
    const merged = mergeAchievementUnlocks(base, incoming)
    expect(merged[0]?.level).toBe(3)
  })
})
