import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/indexedDb', () => ({
  listKnownGroupKeys: vi.fn(async () => []),
}))

import { createDefaultAppState } from '@/lib/constants'
import { groupStorageKey } from '@/lib/appStateLayers'
import {
  isValidInviteSlug,
  normalizeInviteSlug,
  normalizeStorageCode,
} from '@/lib/groupRegistry'
import { tryAutoRelinkGroupProfile } from '@/lib/profileGroupLink'
import { buildWorkspaceList } from '@/lib/workspace'
import type { Player } from '@/types'

describe('groupRegistry helpers', () => {
  it('normalizes storage codes', () => {
    expect(normalizeStorageCode('  OPCG-HK-2026 ')).toBe('opcg-hk-2026')
  })

  it('normalizes and validates invite slugs', () => {
    expect(normalizeInviteSlug('  OPCG HK Shop ')).toBe('opcg-hk-shop')
    expect(isValidInviteSlug('opcg-hk-shop')).toBe(true)
    expect(isValidInviteSlug('ab')).toBe(false)
  })
})

describe('buildWorkspaceList cloud memberships', () => {
  it('merges cloud memberships without local cache', async () => {
    const settings = createDefaultAppState().settings
    const items = await buildWorkspaceList(settings, 0, [
      {
        groupKey: 'hash-a',
        groupCode: 'club-alpha',
        displayName: 'Alpha Club',
        inviteSlug: 'alpha',
        role: 'member',
        joinedAt: '2026-07-01T00:00:00.000Z',
      },
    ])

    const alpha = items.find((item) => item.groupCode === 'club-alpha')
    expect(alpha?.displayName).toBe('Alpha Club')
    expect(alpha?.inviteSlug).toBe('alpha')
    expect(alpha?.role).toBe('member')
  })
})

describe('tryAutoRelinkGroupProfile cloud claim', () => {
  const cloudUserId = 'user-abc'

  function player(overrides: Partial<Player> = {}): Player {
    return {
      id: 'p1',
      name: 'GTC',
      aliases: [],
      archived: false,
      deletedAt: null,
      profileClaimDeviceId: null,
      profileClaimedAt: null,
      linkedUserId: cloudUserId,
      createdAt: '',
      updatedAt: '',
      ...overrides,
    }
  }

  it('relinks via sync_players linked_user_id when bookmark missing', () => {
    const base = createDefaultAppState()
    const state = {
      ...base,
      players: [player()],
      settings: {
        ...base.settings,
        lastGroupCode: 'club-a',
        cloudUserId,
        profileIdentityId: 'prof-1',
        profileSetupCompleted: true,
        linkedPlayerId: null,
        groupProfileLinks: {},
      },
    }

    const next = tryAutoRelinkGroupProfile(state)
    expect(next.settings.linkedPlayerId).toBe('p1')
    expect(next.settings.groupProfileLinks[groupStorageKey('club-a')]?.playerName).toBe('GTC')
  })

  it('prefers bookmark over cloud claim', () => {
    const base = createDefaultAppState()
    const state = {
      ...base,
      players: [player({ id: 'p-cloud' }), player({ id: 'p-book', name: 'King仔', linkedUserId: null })],
      settings: {
        ...base.settings,
        lastGroupCode: 'club-a',
        cloudUserId,
        profileIdentityId: 'prof-1',
        profileSetupCompleted: true,
        linkedPlayerId: null,
        groupProfileLinks: {
          [groupStorageKey('club-a')]: {
            playerId: 'p-book',
            playerName: 'King仔',
            linkedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
    }

    const next = tryAutoRelinkGroupProfile(state)
    expect(next.settings.linkedPlayerId).toBe('p-book')
  })
})
