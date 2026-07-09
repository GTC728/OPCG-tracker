/**
 * V4.10 dumb-user scenarios — profile identity, lifetime stats, layered storage, TEST* protection.
 *
 * Each `describe` block maps to one realistic misuse pattern.
 */
import { describe, expect, it } from 'vitest'
import { migrateLegacyUnlocks, reconcileAchievementUnlocks } from '@/lib/achievements'
import { applyProfileClaim } from '@/lib/profileClaim'
import { groupStorageKey, splitAppState, stripProvisionalUnlocks } from '@/lib/appStateLayers'
import { isTestGroupCode } from '@/lib/groupTest'
import { unlocksForProfile } from '@/lib/profileIdentity'
import { rebuildLifetimeFromMatches } from '@/lib/profileLifetime'
import {
  PROFILE_ID,
  PLAYER_A,
  PLAYER_B,
  baseLinkedState,
  completeMatchesInState,
  deleteMatchFromState,
  makePlayer,
  makeWinStreak,
  reloadGroupFromLayer,
  rawVeteranUnlock,
  saveGroupToIndexedDbLayer,
  simulateLeaveGroup,
  veteranLevel,
} from '@/lib/__tests__/v410Fixtures'

describe('場景 1：在 TEST 群組灌對局以為成就會永久保留', () => {
  it('TEST2026 / test2026 都視為測試群組', () => {
    expect(isTestGroupCode('TEST2026')).toBe(true)
    expect(isTestGroupCode('test2026')).toBe(true)
    expect(isTestGroupCode('TestClub')).toBe(true)
    expect(isTestGroupCode('PROD2026')).toBe(false)
  })

  it('測試群組解鎖標記 provisional，離開後全部丟棄且不污染 lifetime', () => {
    let state = baseLinkedState({ lastGroupCode: 'TEST2026', groupCollabEnabled: true })
    state = completeMatchesInState(state, makeWinStreak(12, PLAYER_A, PLAYER_B))

    const unlocks = unlocksForProfile(state.achievementUnlocks, PROFILE_ID)
    const rawVeteran = rawVeteranUnlock(state)
    expect(rawVeteran?.level).toBeGreaterThanOrEqual(1)
    expect(rawVeteran?.provisional).toBe(true)
    expect(unlocks).toHaveLength(0)
    expect(state.profileLifetime).toBeNull()

    state = simulateLeaveGroup(state)

    expect(state.matches).toHaveLength(0)
    expect(state.players).toHaveLength(0)
    expect(state.achievementUnlocks.filter((item) => item.achievementId === 'veteran')).toHaveLength(0)
    expect(state.profileLifetime).toBeNull()
    expect(state.settings.profileIdentityId).toBe(PROFILE_ID)
  })
})

describe('場景 2：換群組後以為同名玩家成就會消失（UUID 不同）', () => {
  it('profileIdentityId 不變時，重新連結新 UUID 仍看得到舊成就', () => {
    let prod = baseLinkedState({ lastGroupCode: 'CLUB-A' })
    prod = completeMatchesInState(prod, makeWinStreak(12, PLAYER_A, PLAYER_B))
    expect(veteranLevel(prod)).toBeGreaterThanOrEqual(1)

    const personal = splitAppState(prod).personal
    expect(personal.achievementUnlocks.some((item) => item.achievementId === 'veteran')).toBe(true)

    const newPlayerId = 'player-king-new-group'
    const newGroupSnapshot = {
      currentSessionId: null,
      players: [makePlayer(newPlayerId, 'King仔'), makePlayer('player-x', '路人')],
      playerAliases: [],
      sessionPlayers: [],
      sessionDecks: [],
      sessions: [],
      activeMatches: [],
      matches: [],
      matchRevisions: [],
      importBatches: [],
      importRows: [],
      importRecords: [],
    }

    let afterSwitch = reloadGroupFromLayer(
      {
        ...personal,
        settings: {
          ...personal.settings,
          lastGroupCode: 'CLUB-B',
          linkedPlayerId: null,
        },
      },
      newGroupSnapshot,
    )

    afterSwitch = {
      ...afterSwitch,
      settings: {
        ...afterSwitch.settings,
        linkedPlayerId: newPlayerId,
        profileIdentityId: PROFILE_ID,
      },
    }

    const visible = unlocksForProfile(afterSwitch.achievementUnlocks, PROFILE_ID)
    expect(visible.find((item) => item.achievementId === 'veteran')?.level).toBeGreaterThanOrEqual(1)

    const reconciled = reconcileAchievementUnlocks(afterSwitch, newPlayerId).state
    const veteran = unlocksForProfile(reconciled.achievementUnlocks, PROFILE_ID).find(
      (item) => item.achievementId === 'veteran',
    )
    expect(veteran?.playerId).toBe(newPlayerId)
    expect(veteran?.profileIdentityId).toBe(PROFILE_ID)
  })
})

describe('場景 3：撤銷/刪除對局以為成就只升不降', () => {
  it('刪除足夠對局後 veteran 等級會下降或消失', () => {
    let state = baseLinkedState({ lastGroupCode: 'REAL2026' })
    const matches = makeWinStreak(12, PLAYER_A, PLAYER_B)
    state = completeMatchesInState(state, matches)

    expect(veteranLevel(state)).toBe(1)
    expect(state.profileLifetime?.totalMatches).toBe(12)

    for (const match of matches.slice(0, 3)) {
      state = deleteMatchFromState(state, match.id)
    }

    expect(state.profileLifetime?.totalMatches).toBe(9)
    expect(veteranLevel(state)).toBe(0)
    expect(
      unlocksForProfile(state.achievementUnlocks, PROFILE_ID).find((item) => item.achievementId === 'veteran'),
    ).toBeUndefined()
  })
})

describe('場景 4：沒連結檔位先狂打對局，最後才連結', () => {
  it('連結後 migration 會從現有對局重建 lifetime 並解鎖成就', () => {
    let state = baseLinkedState({
      lastGroupCode: 'REAL2026',
      linkedPlayerId: null,
      profileIdentityId: null,
      profileSetupCompleted: false,
    })
    state = {
      ...state,
      matches: makeWinStreak(12, PLAYER_A, PLAYER_B),
    }
    expect(state.profileLifetime).toBeNull()

    state = applyProfileClaim(state, PLAYER_A)
    expect(state.settings.profileIdentityId).toBeTruthy()

    const profileId = state.settings.profileIdentityId!
    state = {
      ...state,
      profileLifetime: rebuildLifetimeFromMatches(profileId, PLAYER_A, state.players, state.matches),
    }
    state = reconcileAchievementUnlocks(state, PLAYER_A).state

    expect(state.profileLifetime?.totalMatches).toBe(12)
    expect(veteranLevel(state, profileId)).toBe(1)
  })
})

describe('場景 5：離開正式群組以為成就也被清掉', () => {
  it('離開群組只清 collab 資料，personal 成就與 lifetime 保留', () => {
    let state = baseLinkedState({ lastGroupCode: 'REAL2026', groupCollabEnabled: true })
    state = completeMatchesInState(state, makeWinStreak(12, PLAYER_A, PLAYER_B))

    const beforePersonal = splitAppState(state).personal
    expect(beforePersonal.achievementUnlocks.length).toBeGreaterThan(0)
    expect(beforePersonal.profileLifetime?.totalMatches).toBe(12)

    const saved = saveGroupToIndexedDbLayer(state, 'REAL2026')
    expect(saved.groupKey).toBe(groupStorageKey('REAL2026'))
    expect(saved.snapshot.matches).toHaveLength(12)

    state = simulateLeaveGroup(state)

    expect(state.matches).toHaveLength(0)
    expect(state.settings.linkedPlayerId).toBeNull()
    expect(unlocksForProfile(state.achievementUnlocks, PROFILE_ID).length).toBeGreaterThan(0)
    expect(state.profileLifetime?.totalMatches).toBe(12)
    expect(state.settings.profileIdentityId).toBe(PROFILE_ID)
  })

  it('split → merge roundtrip 不會把 TEST provisional 混進 personal 層', () => {
    let state = baseLinkedState({ lastGroupCode: 'TEST2026' })
    state = completeMatchesInState(state, makeWinStreak(5, PLAYER_A, PLAYER_B))
    state = stripProvisionalUnlocks(state)

    const { personal, group } = splitAppState(state)
    expect(personal.achievementUnlocks.every((item) => !item.provisional)).toBe(true)
    expect(group.matches).toHaveLength(5)

    const roundtrip = reloadGroupFromLayer(personal, group)
    expect(roundtrip.matches).toHaveLength(5)
    expect(unlocksForProfile(roundtrip.achievementUnlocks, PROFILE_ID)).toHaveLength(0)
  })
})

describe('legacy unlock migration', () => {
  it('舊 playerId-only 解鎖會補上 profileIdentityId', () => {
    const migrated = migrateLegacyUnlocks(
      [
        {
          achievementId: 'veteran',
          playerId: PLAYER_A,
          level: 2,
          unlockedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      PROFILE_ID,
    )
    expect(migrated[0]?.profileIdentityId).toBe(PROFILE_ID)
    expect(unlocksForProfile(migrated, PROFILE_ID)).toHaveLength(1)
  })
})
