import { groupStorageKey, OFFLINE_GROUP_KEY } from '@/lib/appStateLayers'
import type { GroupMemberRole } from '@/lib/groupPermissions'
import { listKnownGroupKeys } from '@/lib/indexedDb'
import type { AppSettings } from '@/types'

export type WorkspaceKind = 'local' | 'group'

export interface WorkspaceDescriptor {
  id: string
  kind: WorkspaceKind
  /** User-facing label (group code or localized "local"). */
  displayName: string
  /** Normalized group code for switch; null for local workspace. */
  groupCode: string | null
  role: GroupMemberRole | null
  isActive: boolean
  lastSyncAt: string | null
  pendingCount?: number
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
): Promise<WorkspaceDescriptor[]> {
  const activeCode = settings.lastGroupCode
  const activeKey = activeCode ? groupStorageKey(activeCode) : null

  const groupKeys = new Set<string>()
  for (const key of Object.keys(settings.groupProfileLinks ?? {})) {
    if (key !== OFFLINE_GROUP_KEY) groupKeys.add(key)
  }
  for (const key of await listKnownGroupKeys()) {
    groupKeys.add(key)
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
    const code = resolveGroupCodeForStorageKey(key, activeCode)
    const isActive = activeKey === key
    return {
      id: key,
      kind: 'group',
      displayName: isActive && activeCode ? activeCode : formatGroupDisplayName(key),
      groupCode: code,
      role: isActive ? settings.groupMemberRole : null,
      isActive,
      lastSyncAt: isActive ? settings.lastGroupSyncAt : null,
      pendingCount: isActive ? pendingCount : undefined,
    }
  })

  groups.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }))
  return [local, ...groups]
}
