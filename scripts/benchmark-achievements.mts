/**
 * Benchmark achievement evaluation. Run: npx tsx scripts/benchmark-achievements.mts
 */
import { createId } from '../src/lib/utils.ts'
import { createDefaultAppState } from '../src/lib/constants.ts'
import {
  ACHIEVEMENT_DEFINITIONS,
  backlogExtrasFromState,
  computeAchievementLeaderboards,
  computeGlobalAchievementRates,
  evaluateAchievementLevels,
  getPlayerAchievementProgress,
} from '../src/lib/achievements.ts'
import type { Deck, Match, Player } from '../src/types/index.ts'

function makeFixture(playerCount: number, matchesPerPlayer: number) {
  const players: Player[] = Array.from({ length: playerCount }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i + 1}`,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    notes: null,
  }))
  const decks: Deck[] = players.flatMap((p, i) => [
    {
      id: `d${i}a`,
      setCode: 'OP01',
      leaderCode: `OP01-${100 + i}`,
      leaderName: `Leader A${i}`,
      colors: ['Red'],
      displayName: `Deck A${i}`,
      aliases: [],
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: `d${i}b`,
      setCode: 'OP02',
      leaderCode: `OP02-${100 + i}`,
      leaderName: `Leader B${i}`,
      colors: ['Blue'],
      displayName: `Deck B${i}`,
      aliases: [],
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
  const matches: Match[] = []
  let n = 0
  for (let round = 0; round < matchesPerPlayer; round += 1) {
    for (let i = 0; i < playerCount; i += 1) {
      const j = (i + 1 + round) % playerCount
      const finishedAt = new Date(Date.UTC(2026, 0, 1 + round, 10 + (n % 12), 0)).toISOString()
      matches.push({
        id: createId(),
        sessionId: 's1',
        matchNumber: n + 1,
        player1Id: players[i].id,
        deck1Id: decks[i * 2].id,
        player2Id: players[j].id,
        deck2Id: decks[j * 2].id,
        winnerPlayerId: round % 2 === 0 ? players[i].id : players[j].id,
        winnerDeckId: round % 2 === 0 ? decks[i * 2].id : decks[j * 2].id,
        firstPlayerId: players[i].id,
        resultType: 'normal',
        startedAt: finishedAt,
        finishedAt,
        notes: null,
        source: 'manual',
        deletedAt: null,
      })
      n += 1
    }
  }
  return { players, decks, matches }
}

function ms(label: string, fn: () => void) {
  const start = performance.now()
  fn()
  const elapsed = performance.now() - start
  console.log(`${label}: ${elapsed.toFixed(1)} ms`)
  return elapsed
}

const { players, decks, matches } = makeFixture(8, 40)
console.log(
  `Fixture: ${players.length} players, ${matches.length} matches, ${ACHIEVEMENT_DEFINITIONS.length} achievement families\n`,
)

const extras = backlogExtrasFromState(createDefaultAppState())

ms('OLD simulate (defs × players full eval)', () => {
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    for (const player of players) {
      evaluateAchievementLevels(player.id, players, decks, matches, null, extras)
    }
    void def.id
  }
})

ms('NEW computeAchievementLeaderboards (1 eval/player)', () => {
  computeAchievementLeaderboards(players, decks, matches)
})

ms('NEW computeGlobalAchievementRates (uses leaderboards)', () => {
  computeGlobalAchievementRates(players, decks, matches)
})

ms('NEW getPlayerAchievementProgress (single player)', () => {
  getPlayerAchievementProgress(players[0].id, players, decks, matches, [], new Map(), null, extras)
})
