import { groupStorageKey, OFFLINE_GROUP_KEY } from '@/lib/appStateLayers'
import type { GroupMemberRole } from '@/lib/groupPermissions'
import type { GroupMembershipSummary } from '@/lib/groupRegistry'
import { listKnownGroupKeys } from '@/lib/indexedDb'
import type { AppSettings } from '@/types'

export type WorkspaceKind = 'local' | 'group'

export interface WorkspaceDescriptor {
  id: string
  kind: WorkspaceKind
  /** User-facing label (group display name or localized "local"). */
  displayName: string
  /** Normalized group code for switch; null for local workspace. */
  groupCode: string | null
  role: GroupMemberRole | null
  isActive: boolean
  lastSyncAt: string | null
  pendingCount?: number
  inviteSlug?: string | null
  joinedAt?: string | null
}

export function formatGroupDisplayName(normalizedCode: string): string {
  return normalizedCode.toUpperCase()
}

export function resolveGroupCodeForStorageKey(
  storageKey: string,
  activeGroupCode: string | null,
): string {
  if (activeGroupCode && groupStorageKey(activeGroupCode) === storageKey) {
    return activeGroupCode
  }
  return storageKey
}

export async function buildWorkspaceList(
  settings: AppSettings,
  pendingCount: number,
  cloudMemberships: GroupMembershipSummary[] = [],
): Promise<WorkspaceDescriptor[]> {
  const activeCode = settings.lastGroupCode
  const activeKey = activeCode ? groupStorageKey(activeCode) : null

  const membershipByCode = new Map(
    cloudMemberships.map((item) => [groupStorageKey(item.groupCode), item]),
  )

  const groupKeys = new Set<string>()
  for (const key of Object.keys(settings.groupProfileLinks ?? {})) {
    if (key !== OFFLINE_GROUP_KEY) groupKeys.add(key)
  }
  for (const key of await listKnownGroupKeys()) {
    groupKeys.add(key)
  }
  for (const membership of cloudMemberships) {
    groupKeys.add(groupStorageKey(membership.groupCode))
  }
  if (activeKey) groupKeys.add(activeKey)

  const local: WorkspaceDescriptor = {
    id: OFFLINE_GROUP_KEY,
    kind: 'local',
    displayName: 'local',
    groupCode: null,
    role: null,
    isActive: !activeCode,
    lastSyncAt: null,
  }

  const groups: WorkspaceDescriptor[] = [...groupKeys].map((key) => {
    const membership = membershipByCode.get(key)
    const code = membership?.groupCode ?? resolveGroupCodeForStorageKey(key, activeCode)
    const isActive = activeKey === key
    const registryName = membership?.displayName
    const fallbackName = isActive && activeCode ? activeCode.toUpperCase() : formatGroupDisplayName(key)
    return {
      id: key,
      kind: 'group',
      displayName: registryName ?? fallbackName,
      groupCode: code,
      role: isActive ? settings.groupMemberRole : membership?.role ?? null,
      isActive,
      lastSyncAt: isActive ? settings.lastGroupSyncAt : null,
      pendingCount: isActive ? pendingCount : undefined,
      inviteSlug: membership?.inviteSlug ?? null,
      joinedAt: membership?.joinedAt ?? null,
    }
  })

  groups.sort((a, b) => {
    if (a.joinedAt && b.joinedAt) {
      return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
    }
    return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
  })
  return [local, ...groups]
}
