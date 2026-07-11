import { getCloudSession, getSupabaseClient, resolveGroupKey } from '@/lib/cloudSync'
import {
  dateSpanDaysFromImportRows,
  dateSpanDaysFromMatches,
} from '@/lib/historicalImport'
import type { AppState, ImportMatchInput, Match } from '@/types'

export type HistoricalGrantResult =
  | { ok: true; grantId: string; spanDays: number; bypassSpan: boolean }
  | { ok: false; error: string }

function timestampsFromImportRows(rows: ImportMatchInput[]): string[] {
  return rows
    .map((row) => (row.date ? new Date(row.date).toISOString() : null))
    .filter((value): value is string => Boolean(value))
}

function timestampsFromMatches(matches: Match[]): string[] {
  return matches.flatMap((match) => [match.startedAt, match.finishedAt])
}

export async function fetchHistoricalBypassPrivilege(): Promise<boolean> {
  const supabase = await getSupabaseClient()
  if (!supabase) return false
  const { user } = await getCloudSession()
  if (!user) return false
  const { data, error } = await supabase.rpc('user_has_historical_bypass')
  if (error) {
    console.warn('user_has_historical_bypass failed', error)
    return false
  }
  return Boolean(data)
}

export async function requestHistoricalImportGrant(
  rows: ImportMatchInput[],
  groupCode?: string | null,
): Promise<HistoricalGrantResult> {
  const supabase = await getSupabaseClient()
  if (!supabase) {
    return { ok: false, error: '雲端未設定，無法取得伺服器授權' }
  }
  const { user } = await getCloudSession()
  if (!user) {
    return { ok: false, error: '請先登入雲端帳號以使用歷史還原授權' }
  }

  const timestamps = timestampsFromImportRows(rows)
  if (timestamps.length < 2) {
    return { ok: false, error: '歷史還原需要至少 2 筆有效日期欄位' }
  }

  let groupKey: string | null = null
  if (groupCode) {
    try {
      groupKey = await resolveGroupKey(groupCode)
    } catch {
      groupKey = null
    }
  }

  const { data, error } = await supabase.rpc('request_historical_import_grant', {
    p_match_count: rows.length,
    p_timestamps: timestamps,
    p_group_key: groupKey,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  const spanDays = dateSpanDaysFromImportRows(rows) ?? 0
  const bypassSpan = await fetchHistoricalBypassPrivilege()
  return { ok: true, grantId: String(data), spanDays, bypassSpan }
}

export async function requestHistoricalImportGrantForMatches(
  matches: Match[],
  groupCode?: string | null,
): Promise<HistoricalGrantResult> {
  const supabase = await getSupabaseClient()
  if (!supabase) {
    return { ok: false, error: '雲端未設定，無法取得伺服器授權' }
  }
  const { user } = await getCloudSession()
  if (!user) {
    return { ok: false, error: '請先登入雲端帳號以使用歷史還原授權' }
  }

  const timestamps = timestampsFromMatches(matches)
  if (timestamps.length < 2) {
    return { ok: false, error: '無法計算日期跨度' }
  }

  let groupKey: string | null = null
  if (groupCode) {
    try {
      groupKey = await resolveGroupKey(groupCode)
    } catch {
      groupKey = null
    }
  }

  const { data, error } = await supabase.rpc('request_historical_import_grant', {
    p_match_count: matches.length,
    p_timestamps: timestamps,
    p_group_key: groupKey,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  const spanDays = dateSpanDaysFromMatches(matches) ?? 0
  const bypassSpan = await fetchHistoricalBypassPrivilege()
  return { ok: true, grantId: String(data), spanDays, bypassSpan }
}

export function resolveIntegrityGrantIdForMatch(state: AppState, matchId: string): string | null {
  for (const batch of state.importBatches) {
    if (!batch.historicalRestore || batch.revertedAt || !batch.integrityGrantId) continue
    const linked = state.importRows.some(
      (row) => row.batchId === batch.id && row.matchId === matchId,
    )
    if (linked) return batch.integrityGrantId
  }
  return null
}

/** Attach server grants to historical batches missing one (before group sync). */
export async function ensureHistoricalGrantsForState(state: AppState): Promise<AppState> {
  const groupCode = state.settings.lastGroupCode
  let next = state
  let changed = false

  for (const batch of state.importBatches) {
    if (!batch.historicalRestore || batch.revertedAt || batch.integrityGrantId) continue

    const matchIds = new Set(
      state.importRows
        .filter((row) => row.batchId === batch.id && row.status === 'imported' && row.matchId)
        .map((row) => row.matchId as string),
    )
    const batchMatches = state.matches.filter(
      (match) => matchIds.has(match.id) && match.deletedAt === null && match.source === 'historical',
    )
    if (!batchMatches.length) continue

    const grant = await requestHistoricalImportGrantForMatches(batchMatches, groupCode)
    if (!grant.ok) {
      throw new Error(grant.error)
    }

    next = {
      ...next,
      importBatches: next.importBatches.map((item) =>
        item.id === batch.id ? { ...item, integrityGrantId: grant.grantId } : item,
      ),
    }
    changed = true
  }

  return changed ? next : state
}
