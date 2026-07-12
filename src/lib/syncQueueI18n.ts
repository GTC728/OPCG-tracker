import type { TranslationKey } from '@/lib/i18n'
import type { SyncQueueOp } from '@/lib/syncQueue'

export function describeSyncOp(
  op: SyncQueueOp,
  t: (key: TranslationKey) => string,
): string {
  switch (op.kind) {
    case 'upsert_active':
      return t('syncQueue.op.upsertActive').replace('{n}', String(op.matchIds.length))
    case 'delete_active':
      return t('syncQueue.op.deleteActive')
    case 'upsert_matches':
      return t('syncQueue.op.upsertMatches').replace('{n}', String(op.matchIds.length))
    case 'upsert_players':
      return t('syncQueue.op.upsertPlayers').replace('{n}', String(op.playerIds.length))
    case 'delete_player':
      return t('syncQueue.op.deletePlayer')
    case 'upsert_sessions':
      return t('syncQueue.op.upsertSessions').replace('{n}', String(op.sessionIds.length))
    case 'merge_players':
      return t('syncQueue.op.mergePlayers')
    default:
      return t('syncQueue.op.generic')
  }
}
