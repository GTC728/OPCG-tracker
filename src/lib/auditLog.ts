import { getDeviceId } from '@/lib/deviceId'
import { createId, nowIso } from '@/lib/utils'
import type { AuditActor, AuditEntry, AuditKind, AppState } from '@/types'

export const MAX_AUDIT_ENTRIES = 80

export interface AppendAuditOptions {
  actor?: AuditActor
  entityId?: string
  meta?: Record<string, string>
}

export function resolveLocalAuditActor(state: AppState): AuditActor {
  const userId = state.settings.cloudUserId
  const profileName = state.settings.profileDisplayName?.trim()
  if (userId) {
    return {
      type: 'user',
      id: userId,
      label: profileName || state.settings.deviceLabel || 'Cloud user',
    }
  }
  return {
    type: 'device',
    id: getDeviceId(),
    label: state.settings.deviceLabel || 'This device',
  }
}

export function remoteAuditActor(updatedBy: string, label?: string): AuditActor {
  return {
    type: 'remote',
    id: updatedBy,
    label: label ?? `User ${updatedBy.slice(0, 8)}`,
  }
}

export function appendAuditEntry(
  state: AppState,
  kind: AuditKind,
  message: string,
  options?: AppendAuditOptions,
): AppState {
  const entry: AuditEntry = {
    id: createId(),
    at: nowIso(),
    kind,
    message,
    actor: options?.actor ?? resolveLocalAuditActor(state),
    entityId: options?.entityId,
    meta: options?.meta,
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

export function formatAuditActor(actor: AuditActor | undefined): string {
  if (!actor) return ''
  if (actor.type === 'remote') return `Remote · ${actor.label}`
  if (actor.type === 'user') return actor.label
  return actor.label
}
