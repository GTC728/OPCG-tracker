import { describe, expect, it } from 'vitest'
import { createDefaultAppState } from '@/lib/constants'
import { getLeaderDisplayName } from '@/lib/leaderDisplay'
import { LEADER_LOCALE_ALIASES } from '@/data/leaderLocaleAliases'
import { resolveMergedLinkedUserId } from '@/lib/groupSync'
import {
  applyProfileClaim,
  ProfileClaimError,
  uniqueRosterName,
} from '@/lib/profileClaim'
import { tryAutoRelinkGroupProfile } from '@/lib/profileGroupLink'
import { groupStorageKey } from '@/lib/appStateLayers'
import type { Player } from '@/types'

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'King仔',
    aliases: [],
    archived: false,
    deletedAt: null,
    profileClaimDeviceId: null,
    profileClaimedAt: null,
    linkedUserId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('V5.6.3 roster link ownership', () => {
  it('refuses to steal a player already linked to another account', () => {
    const base = createDefaultAppState()
    const state = {
      ...base,
      players: [player({ linkedUserId: 'owner-1' })],
      settings: { ...base.settings, cloudUserId: 'intruder-2', profileIdentityId: 'prof-1' },
    }
    expect(() => applyProfileClaim(state, 'p1')).toThrow(ProfileClaimError)
    try {
      applyProfileClaim(state, 'p1')
    } catch (caught) {
      expect(caught).toBeInstanceOf(ProfileClaimError)
      expect((caught as ProfileClaimError).code).toBe('claimed_by_other_user')
    }
  })

  it('clears the previous exclusive bind when the same account links another player', () => {
    const base = createDefaultAppState()
    const state = {
      ...base,
      players: [
        player({ id: 'p1', name: 'King仔', linkedUserId: 'user-1' }),
        player({ id: 'p2', name: 'Bobby', linkedUserId: null }),
      ],
      settings: { ...base.settings, cloudUserId: 'user-1', profileIdentityId: 'prof-1' },
    }
    const next = applyProfileClaim(state, 'p2')
    expect(next.players.find((item) => item.id === 'p1')?.linkedUserId).toBeNull()
    expect(next.players.find((item) => item.id === 'p2')?.linkedUserId).toBe('user-1')
    expect(next.settings.linkedPlayerId).toBe('p2')
  })

  it('makes approved roster names unique', () => {
    expect(uniqueRosterName([player({ name: 'Member' })], 'Member')).toBe('Member 2')
  })
})

describe('V5.6.3 link merge LWW', () => {
  it('lets a newer remote unlink win', () => {
    expect(
      resolveMergedLinkedUserId(
        { linkedUserId: 'user-1', updatedAt: '2026-07-01T00:00:00.000Z' },
        null,
        '2026-07-02T00:00:00.000Z',
      ),
    ).toBeNull()
  })

  it('keeps a newer local link', () => {
    expect(
      resolveMergedLinkedUserId(
        { linkedUserId: 'user-1', updatedAt: '2026-07-03T00:00:00.000Z' },
        null,
        '2026-07-02T00:00:00.000Z',
      ),
    ).toBe('user-1')
  })
})

describe('V5.6.3 poll relink', () => {
  it('does not auto-bind a bookmark during group poll', () => {
    const base = createDefaultAppState()
    const state = {
      ...base,
      players: [player()],
      settings: {
        ...base.settings,
        lastGroupCode: 'club-a',
        profileIdentityId: 'prof-1',
        profileSetupCompleted: true,
        linkedPlayerId: null,
        groupProfileLinks: {
          [groupStorageKey('club-a')]: {
            playerId: 'p1',
            playerName: 'King仔',
            linkedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
    }
    const next = tryAutoRelinkGroupProfile(state, { allowBookmark: false })
    expect(next.settings.linkedPlayerId).toBeNull()
  })
})

describe('V5.6.3 Hong Kong leader names', () => {
  it('uses HK Traditional Chinese labels by default', () => {
    expect(getLeaderDisplayName('Charlotte Pudding', 'zh-Hant', 'hk')).toBe('布琳')
    expect(getLeaderDisplayName('Roronoa Zoro', 'zh-Hant', 'hk')).toBe('卓洛')
    expect(getLeaderDisplayName('Rocks.D.Xebec', 'zh-Hant', 'hk')).toBe('洛克斯*')
  })

  it('keeps Taiwan labels when the variant is tw', () => {
    expect(getLeaderDisplayName('Charlotte Pudding', 'zh-Hant', 'tw')).toBe('布丁')
    expect(getLeaderDisplayName('Roronoa Zoro', 'zh-Hant', 'tw')).toBe('索隆')
  })

  it('keeps both translations searchable', () => {
    expect(LEADER_LOCALE_ALIASES['Charlotte Pudding']).toEqual(expect.arrayContaining(['布丁', '布琳']))
    expect(LEADER_LOCALE_ALIASES['Roronoa Zoro']).toEqual(expect.arrayContaining(['索隆', '卓洛']))
    expect(LEADER_LOCALE_ALIASES['Rocks.D.Xebec']).toEqual(expect.arrayContaining(['洛克斯', 'Rocks']))
  })
})
