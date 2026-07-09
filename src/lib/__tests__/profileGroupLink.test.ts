import { describe, expect, it } from 'vitest'
import { evaluateRemainingBacklogMetrics } from '@/lib/achievementsBacklogRemainingEval'
import { backlogExtrasFromState } from '@/lib/achievements'
import { createDefaultAppState } from '@/lib/constants'
import { groupStorageKey } from '@/lib/appStateLayers'
import {
  bookmarkCurrentGroupProfile,
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

describe('跨群組個人檔自動重連', () => {
  it('離開群組會保存 bookmark，加入後自動重連同名玩家', () => {
    let state = baseLinkedState({ lastGroupCode: 'CLUB-A' })
    state = completeMatchesInState(state, makeWinStreak(12, PLAYER_A, PLAYER_B))
    expect(veteranLevel(state)).toBe(1)

    state = bookmarkCurrentGroupProfile(state)
    state = simulateLeaveGroup(state)
    expect(state.settings.linkedPlayerId).toBeNull()
    expect(state.settings.groupProfileLinks[groupStorageKey('CLUB-A')]?.playerName).toBe('King仔')
    expect(veteranLevel(state)).toBe(1)

    const newPlayerId = 'player-king-club-b'
    state = {
      ...state,
      players: [makePlayer(newPlayerId, 'King仔'), makePlayer('x', '路人')],
      settings: {
        ...state.settings,
        lastGroupCode: 'CLUB-B',
        linkedPlayerId: null,
      },
    }

    state = tryAutoRelinkGroupProfile(state)
    expect(state.settings.linkedPlayerId).toBe(newPlayerId)
    expect(veteranLevel(state)).toBe(1)
  })

  it('連結檔案後立即 reconcile，零場次新群組仍保留 lifetime 成就', () => {
    let state = baseLinkedState({ lastGroupCode: 'CLUB-A' })
    state = completeMatchesInState(state, makeWinStreak(12, PLAYER_A, PLAYER_B))

    state = simulateLeaveGroup(state)
    state = {
      ...state,
      players: [makePlayer('new-id', 'King仔')],
      matches: [],
      settings: { ...state.settings, lastGroupCode: 'CLUB-B', linkedPlayerId: null },
    }

    state = finalizeProfileLink({
      ...state,
      settings: {
        ...state.settings,
        linkedPlayerId: 'new-id',
        profileIdentityId: PROFILE_ID,
        profileSetupCompleted: true,
      },
    })

    expect(state.profileLifetime?.totalMatches).toBe(12)
    expect(veteranLevel(state)).toBe(1)
  })
})

describe('group_anchor 不再用人數灌水', () => {
  it('大群組零對局玩家不會因 roster 人數解鎖 group_anchor', () => {
    const state = createDefaultAppState()
    const players = Array.from({ length: 20 }, (_, index) =>
      makePlayer(`p-${index}`, `玩家${index}`),
    )
    const extras = backlogExtrasFromState({
      ...state,
      players,
      settings: { ...state.settings, lastGroupCode: 'BIG', linkedPlayerId: 'p-0' },
    })
    const metrics = evaluateRemainingBacklogMetrics('p-0', players, state.decks, [], extras)
    expect(metrics.group_anchor).toBe(0)
  })

  it('group_code_join 只給已連結本人', () => {
    const state = createDefaultAppState()
    const players = [makePlayer(PLAYER_A, 'A'), makePlayer(PLAYER_B, 'B')]
    const extras = backlogExtrasFromState({
      ...state,
      players,
      settings: { ...state.settings, lastGroupCode: 'G1', linkedPlayerId: PLAYER_A },
    })
    const linked = evaluateRemainingBacklogMetrics(PLAYER_A, players, state.decks, [], extras)
    const other = evaluateRemainingBacklogMetrics(PLAYER_B, players, state.decks, [], extras)
    expect(linked.group_code_join).toBe(1)
    expect(other.group_code_join ?? 0).toBe(0)
  })
})
