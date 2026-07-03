# Events And Leagues Blueprint

This document records the future design direction for store tournaments, custom scoring systems, and long-running League play. It is planning documentation only; it does not describe a completed implementation.

## Product Principle

Events and Leagues should be integrated into OPCG Tracker, but they should not pollute ordinary Session data.

The product should keep three concepts separate:

- `Session`: everyday match recording for store play, testing, and casual games.
- `Event`: a bounded activity with entrants, rounds, pairings, results, standings, and a final report.
- `League`: a long-running ruleset that reads existing match data and calculates points without changing the original match records.

## Why This Matters

The current app is good at recording matches. Store events and custom scoring games need more structure:

- Store tournaments need pairings, rounds, standings, and result entry.
- Long-running scoring games need rules, date ranges, eligibility, Top Tier logic, and leaderboard calculation.
- Content creators and store owners may need reports.
- Playtest groups may want custom restrictions such as banning top decks.

These needs should reuse players, Leaders, deck variants, match records, import/export, and analytics, but they should remain separate modules.

## Stakeholders

### Store Owner / Staff

Needs:

- Run a 16-player store event.
- Randomize first-round pairings.
- Enter results quickly.
- Generate next-round pairings.
- View standings.
- Export a report after the event.

Important UX:

- Few taps.
- Clear table numbers.
- Simple result entry.
- Good mobile readability.

### Tournament Organizer

Needs:

- Create Swiss rounds.
- Avoid repeat pairings.
- Handle bye, draw, drop, and late changes.
- Review standings and final report.

Important UX:

- Pairings and standings must be trusted.
- Result mistakes must be editable.
- Export must be easy.

### Playtest Group

Needs:

- Run a custom League over many weeks.
- Score Leaders rather than players.
- Test meta decks and anti-meta decks.
- Apply special rules such as Top Tier rewards or penalties.

Important UX:

- Rules should be visible.
- Leaderboard should explain where points came from.
- Original match records should remain unchanged.

### Competitive Tester / Meta Analyst

Needs:

- Filter data by set, date, group, session, event, or League.
- Compare Leader performance over time.
- Export tables and reports.

Important UX:

- Trustworthy filters.
- Clear sample sizes.
- Explainable scoring.

## Store Tournament Mode

Store Tournament Mode is for one bounded tournament, such as a 16-player Swiss event.

### Recommended First Version

V4.1 should support a practical small-store workflow:

1. Create an Event.
2. Choose tournament type: Swiss.
3. Add players.
4. Assign each player a Leader/deck.
5. Generate round 1 pairings randomly.
6. Enter results.
7. Generate next-round pairings by score.
8. Show standings.
9. Complete event.
10. Export event report.

### Event Data Shape

```text
Event
- id
- name
- type: swiss
- status: draft | active | completed
- createdAt
- startedAt
- completedAt
- settings

EventPlayer
- eventId
- playerId
- deckId
- seed
- droppedAt

EventRound
- id
- eventId
- roundNumber
- status: pending | active | completed

EventMatch
- id
- eventId
- roundId
- tableNumber
- player1Id
- player2Id
- deck1Id
- deck2Id
- winnerPlayerId
- resultType: normal | draw | bye | forfeit
- linkedMatchId
```

### Swiss Pairing Rules

First implementation should be simple and transparent:

- Round 1 random pairing.
- Later rounds pair players by match points.
- Avoid repeat opponents when possible.
- Assign a bye if player count is odd.
- Do not implement complex official tie-breakers in the first version.

Future tie-breakers can include:

- Opponent match win percentage.
- Game win percentage.
- Head-to-head.
- Strength of schedule.

### Relationship With Normal Matches

Event matches may link to normal `Match` records:

- The normal match database remains the source of actual gameplay records.
- Event data stores event-specific context such as round, table, pairing, and points.
- Editing an event result should update or relink the associated match record carefully.

## League Mode

League Mode is for long-running custom scoring systems. It should calculate from existing data and should not mutate the original match records.

### Example: OP17 Leader League

User-proposed example:

1. Use Leader as the scoring unit.
2. Win = 1 point.
3. Loss = 0 points.
4. Starting from 5 points, the highest scoring 5 Leaders become Top Tier.
5. Beating a Top Tier Leader gives 2 points.
6. The losing Top Tier Leader loses 1 point.
7. Continue until OP19, then settle final standings.

### League Data Shape

```text
League
- id
- name
- status: draft | active | completed
- unit: leader | deckVariant | player | playerDeck
- startsAt
- endsAt
- sourceFilter
- rulesetId

Ruleset
- id
- name
- unit
- baseWinPoints
- baseLossPoints
- topTierEnabled
- topTierThreshold
- topTierCount
- beatTopTierPoints
- topTierLossPenalty
- bannedLeaderIds
- eligibleLeaderIds
- notes
```

### Source Filtering

A League should read matches through filters:

- Date range.
- Group.
- Session.
- Event.
- Player.
- Leader.
- Deck variant.
- Deleted matches excluded by default.

This keeps the scoring layer separate from the raw data.

### Calculated Outputs

League mode should display:

- Leaderboard.
- Total points.
- Wins / losses.
- Points gained from normal wins.
- Bonus points from beating Top Tier.
- Penalties from losing as Top Tier.
- Current Top Tier list.
- Banned or ineligible Leaders.
- Match list that contributed to each score.

### Explainability

Every score should be explainable:

```text
Leader: Yamato
Base wins: 6 x 1 = 6
Beat Top Tier: 2 x 2 = 4
Top Tier losses: 1 x -1 = -1
Total: 9
```

This matters because custom rules can otherwise feel arbitrary.

## Ban Top Deck / Top Tier Rules

Ban and Top Tier systems should be rules inside League or Event settings, not a separate product area.

Possible rule types:

- Manual banned Leader list.
- Automatically ban top N Leaders.
- Automatically mark Leaders as Top Tier after reaching a threshold.
- Extra reward for beating Top Tier.
- Penalty for Top Tier losing.
- Restrict points so banned Leaders can play but cannot score.
- Restrict entry so banned Leaders cannot be selected.

## UI Direction

### Navigation

Short-term:

```text
Record
Stats
History
Settings
```

Events/Leagues can initially live under Settings or an internal page.

Long-term:

```text
Record
Stats
History
Events
Settings
```

The `Events` tab can contain:

- Store Tournament.
- League.
- Reports.

### Event Home

Event cards should show:

- Event name.
- Type.
- Status.
- Entrants.
- Current round.
- Next action.

### League Home

League cards should show:

- League name.
- Date range.
- Scoring unit.
- Active ruleset summary.
- Current top 5.
- Next action.

## Suggested Roadmap

### V4.0 Event / League Foundation

- Add Event and League data structures.
- Add read-only planning UI or draft creation UI.
- Link Event/League concepts to existing players, Leaders, sessions, and matches.
- Do not implement full Swiss yet.

### V4.1 Store Tournament

- Create Swiss Event.
- Add entrants.
- Generate pairings.
- Enter results.
- Show standings.
- Export event report.

### V4.2 League Ruleset

- Create League.
- Define Leader-based scoring.
- Support Top Tier threshold and top N.
- Calculate leaderboard from existing matches.
- Show scoring explanation.

### V4.3 Restrictions And Reports

- Add banned Leader rules.
- Add report export.
- Add shareable public/read-only report concept.

## Non-Goals For The First Implementation

- Full official tournament software replacement.
- Complex sanctioned event compliance.
- Automatic pairing conflict resolution for every rare edge case.
- Public account system beyond current Supabase login.
- Real-time multi-device conflict-free event operation.

## Open Questions

- Should Event matches automatically create normal `Match` records, or should they be imported into History only after the event completes?
- Should League scoring use Leader, DeckVariant, Player, or Player+Deck as the default unit?
- Should banned Leaders be blocked from entry, or allowed but not scored?
- Should a store tournament support draws in the first version?
- How should Cloud Group permissions work for event organizers versus players?
