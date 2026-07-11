import { describe, expect, it } from 'vitest'
import { createDefaultAppState } from '@/lib/constants'
import { resolveIntegrityGrantIdForMatch } from '@/lib/serverIntegrity'
import type { ImportBatch, ImportRow, Match } from '@/types'

describe('serverIntegrity', () => {
  it('resolves integrity grant from historical import batch', () => {
    const batch: ImportBatch = {
      id: 'batch-1',
      filename: 'old.csv',
      importedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 18,
      totalRows: 1,
      successCount: 1,
      errorCount: 0,
      rawFileHash: '1:old.csv',
      revertedAt: null,
      targetSessionId: 'session-1',
      historicalRestore: true,
      integrityGrantId: 'grant-abc',
    }
    const row: ImportRow = {
      id: 'row-1',
      batchId: 'batch-1',
      rowNumber: 2,
      raw: {},
      status: 'imported',
      errorMessage: null,
      matchId: 'match-1',
    }
    const match: Match = {
      id: 'match-1',
      sessionId: 'session-1',
      matchNumber: 1,
      player1Id: 'p1',
      deck1Id: 'd1',
      player2Id: 'p2',
      deck2Id: 'd2',
      winnerPlayerId: 'p1',
      winnerDeckId: 'd1',
      firstPlayerId: null,
      resultType: 'normal',
      startedAt: '2026-01-01T00:00:00.000Z',
      finishedAt: '2026-01-01T00:00:00.000Z',
      source: 'historical',
      deletedAt: null,
      notes: null,
    }

    const state = {
      ...createDefaultAppState(),
      importBatches: [batch],
      importRows: [row],
      matches: [match],
    }

    expect(resolveIntegrityGrantIdForMatch(state, 'match-1')).toBe('grant-abc')
    expect(resolveIntegrityGrantIdForMatch(state, 'missing')).toBeNull()
  })
})
