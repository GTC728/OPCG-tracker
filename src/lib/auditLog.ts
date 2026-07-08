import { createId, nowIso } from '@/lib/utils'
import type { AuditEntry, AuditKind, AppState } from '@/types'

export const MAX_AUDIT_ENTRIES = 80

export function appendAuditEntry(
  state: AppState,
  kind: AuditKind,
  message: string,
): AppState {
  const entry: AuditEntry = {
    id: createId(),
    at: nowIso(),
    kind,
    message,
  }
  const auditLog = [entry, ...(state.auditLog ?? [])].slice(0, MAX_AUDIT_ENTRIES)
  return { ...state, auditLog }
}

export function formatAuditTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
