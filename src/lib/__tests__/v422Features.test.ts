import { describe, expect, it } from 'vitest'
import {
  detectJoinConflicts,
  isBenignPlayerJoinDrift,
  mergeBenignJoinedPlayer,
  type RemoteGroupEntities,
} from '@/lib/conflictResolver'
import { captureGroupScopedSnapshot } from '@/lib/groupScope'
import { createDefaultAppState } from '@/lib/constants'
import type { Player } from '@/types'

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p-bobby',
    name: 'Bobby',
    aliases: [],
    archived: false,
    deletedAt: null,
    linkedUserId: 'user-1',
    profileClaimDeviceId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('benign profile-link join drift', () => {
  const ctx = { cloudUserId: 'user-1', bookmarkPlayerId: 'p-bobby' }

  it('detects bookmarked player link drift as benign', () => {
    const local = player({ linkedUserId: 'user-1' })
    const remote = player({ linkedUserId: null })
    expect(isBenignPlayerJoinDrift(local, remote, ctx)).toBe(true)
  })

  it('skips benign drift in join conflict detection', () => {
    const base = createDefaultAppState()
    const state = {
      ...base,
      players: [player({ linkedUserId: 'user-1' })],
      settings: {
        ...base.settings,
        cloudUserId: 'user-1',
        groupProfileLinks: {
          'group:ghk-2026': { playerId: 'p-bobby', playerName: 'Bobby', linkedAt: '2026-07-01T00:00:00.000Z' },
        },
      },
    }
    const snapshot = captureGroupScopedSnapshot(state)
    const remote: RemoteGroupEntities = {
      activeMatches: [],
      matches: [],
      players: [player({ linkedUserId: null })],
      sessions: [],
      meta: {
        matchUpdatedAt: new Map(),
        matchUpdatedBy: new Map(),
        playerUpdatedAt: new Map([['p-bobby', '2026-07-02T00:00:00.000Z']]),
        playerUpdatedBy: new Map([['p-bobby', null]]),
        sessionUpdatedAt: new Map(),
        sessionUpdatedBy: new Map(),
        activeUpdatedAt: new Map(),
        activeUpdatedBy: new Map(),
      },
    }

    const conflicts = detectJoinConflicts(snapshot, remote, ctx)
    expect(conflicts).toHaveLength(0)
  })

  it('merges linkedUserId from local when benign', () => {
    const local = player({ linkedUserId: 'user-1' })
    const remote = player({ linkedUserId: null })
    const merged = mergeBenignJoinedPlayer(local, remote, ctx)
    expect(merged.linkedUserId).toBe('user-1')
  })
})
