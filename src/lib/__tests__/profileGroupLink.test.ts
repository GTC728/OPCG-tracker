import { describe, expect, it } from 'vitest'
import { evaluateRemainingBacklogMetrics } from '@/lib/achievementsBacklogRemainingEval'
import { backlogExtrasFromState } from '@/lib/achievements'
import { createDefaultAppState } from '@/lib/constants'
import { groupStorageKey } from '@/lib/appStateLayers'
import { createPersonalProfile, hasPersonalProfile } from '@/lib/personalProfile'
import {
  finalizeProfileLink,
  tryAutoRelinkGroupProfile,
} from '@/lib/profileGroupLink'
import {
  PROFILE_ID,
  PLAYER_A,
  PLAYER_B,
  baseLinkedState,
  completeMatchesInState,
  makePlayer,
  makeWinStreak,
  simulateLeaveGroup,
  veteranLevel,
} from '@/lib/__tests__/v410Fixtures'

describe('個人檔 GTC 與群組 Bobby 分離', () => {
  it('書籤只存群組名，不覆寫個人檔名', () => {
    let state = baseLinkedState({ lastGroupCode: 'CLUB-A', profileDisplayName: 'GTC' })
    state = completeMatchesInState(state, makeWinStreak(5, PLAYER_A, PLAYER_B))
    state = simulateLeaveGroup(state)
    expect(state.settings.profileDisplayName).toBe('GTC')
    expect(state.settings.groupProfileLinks[groupStorageKey('CLUB-A')]?.playerName).toBe('King仔')
    expect(hasPersonalProfile(state)).toBe(true)
  })

  it('有書籤時自動重連群組玩家（名稱可不同）', () => {
    let state = createPersonalProfile(createDefaultAppState(), 'GTC')
    state = {
      ...state,
      settings: {
        ...state.settings,
        profileIdentityId: PROFILE_ID,
        lastGroupCode: 'CLUB-B',
        groupProfileLinks: {
          [groupStorageKey('CLUB-B')]: {
            playerId: 'bobby-id',
            playerName: 'Bobby',
            linkedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
      players: [makePlayer('bobby-id', 'Bobby'), makePlayer('x', 'Other')],
    }
    state = tryAutoRelinkGroupProfile(state)
    expect(state.settings.linkedPlayerId).toBe('bobby-id')
    expect(state.settings.profileDisplayName).toBe('GTC')
  })
})

describe('成就誤判修正', () => {
  it('只完成 onboarding 但不足 10 場不解鎖結業生', () => {
    const state = createDefaultAppState()
    const players = [makePlayer(PLAYER_A, 'A')]
    const extras = backlogExtrasFromState({
      ...state,
      settings: { ...state.settings, onboardingCompleted: true, linkedPlayerId: PLAYER_A },
    })
    const metrics = evaluateRemainingBacklogMetrics(PLAYER_A, players, state.decks, [], extras)
    expect(metrics.onboarding_graduate).toBe(0)
  })

  it('零勝場不解鎖 secret_handshake', () => {
    const state = createDefaultAppState()
    const players = [makePlayer(PLAYER_A, 'A')]
    const extras = backlogExtrasFromState(state)
    const metrics = evaluateRemainingBacklogMetrics(PLAYER_A, players, state.decks, [], extras)
    expect(metrics.secret_handshake).toBe(0)
  })
})

describe('跨群組 lifetime 保留', () => {
  it('finalizeProfileLink 不會用 0 場覆蓋既有 lifetime', () => {
    let state = baseLinkedState({ lastGroupCode: 'CLUB-A', profileDisplayName: 'GTC' })
    state = completeMatchesInState(state, makeWinStreak(12, PLAYER_A, PLAYER_B))
    state = simulateLeaveGroup(state)
    state = {
      ...state,
      players: [makePlayer('new-id', 'Bobby')],
      matches: [],
      settings: {
        ...state.settings,
        lastGroupCode: 'CLUB-B',
        linkedPlayerId: 'new-id',
      },
    }
    state = finalizeProfileLink(state)
    expect(state.profileLifetime?.totalMatches).toBe(12)
    expect(veteranLevel(state)).toBe(1)
  })
})
