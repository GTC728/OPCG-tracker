import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { GroupClanRoster } from '@/components/lobby/GroupClanRoster'
import { GroupLobbyPanel } from '@/components/settings/GroupLobbyPanel'
import { useToast } from '@/components/ui/Toast'
import { flushGroupCollabSyncNow } from '@/lib/groupSync'
import { getCloudSession, isCloudConfigured } from '@/lib/cloudSync'
import { groupRoleLabel } from '@/lib/groupPermissions'
import { listMyGroupMemberships } from '@/lib/groupRegistry'
import {
  joinGroupWithPolicy,
  joinPolicyLabelKey,
  resolveGroupLookup,
  searchPublicGroups,
  visibilityLabelKey,
  type PublicGroupCard,
} from '@/lib/groupLobby'
import { useI18n } from '@/lib/i18n'
import { getCompletedMatches } from '@/lib/stats'
import { getCachedSyncPendingCount, subscribeSyncPendingCount } from '@/lib/syncQueue'
import { buildWorkspaceList, type WorkspaceDescriptor } from '@/lib/workspace'
import { formatDateTime } from '@/lib/utils'
import { getAppState, useAppStore } from '@/stores/appStore'

type LobbySort = 'active' | 'matches' | 'players'
type LobbyTab = 'home' | 'search'

export type LobbyNavigateTarget = 'session' | 'players' | 'sync' | 'join'

interface GroupLobbyHubProps {
  onClose?: () => void
  onNavigate?: (target: LobbyNavigateTarget) => void
  /** Force search tab (e.g. from empty state CTA). */
  initialTab?: LobbyTab
}

function formatSyncTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function GroupClanInfoCard({
  activeGroup,
  onOpenSettings,
}: {
  activeGroup: WorkspaceDescriptor
  onOpenSettings: () => void
}) {
  const { t } = useI18n()
  const settings = useAppStore((state) => state.settings)
  const players = useAppStore((state) => state.players)
  const matches = useAppStore((state) => state.matches)
  const sessions = useAppStore((state) => state.sessions)
  const pendingCount = getCachedSyncPendingCount()
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true

  const stats = useMemo(() => {
    const completed = getCompletedMatches(matches)
    const activePlayers = players.filter((player) => !player.archived && !player.deletedAt).length
    return {
      matches: completed.length,
      players: activePlayers,
      sessions: sessions.filter((session) => !session.deletedAt).length,
    }
  }, [matches, players, sessions])

  const syncLine = useMemo(() => {
    if (settings.groupSyncPaused) return t('systemStatus.syncPaused')
    if (!online) return t('sync.offline')
    if (settings.lastGroupSyncError) return settings.lastGroupSyncError
    if (pendingCount > 0) return t('sync.pendingCount').replace('{n}', String(pendingCount))
    if (settings.lastGroupSyncAt) {
      return t('systemStatus.syncedAt').replace('{time}', formatSyncTime(settings.lastGroupSyncAt))
    }
    return t('systemStatus.syncReady')
  }, [
    online,
    pendingCount,
    settings.groupSyncPaused,
    settings.lastGroupSyncAt,
    settings.lastGroupSyncError,
    t,
  ])

  return (
    <section className="rounded-xl bg-brand-500/10 p-4 ring-1 ring-brand-500/25">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-brand-100">{t('lobby.currentClan')}</p>
          <p className="mt-1 truncate text-lg font-bold">{activeGroup.displayName}</p>
          {activeGroup.role ? (
            <p className="mt-0.5 text-xs text-text-secondary">{groupRoleLabel(activeGroup.role)}</p>
          ) : null}
          {activeGroup.inviteSlug ? (
            <p className="mt-1 font-mono text-[11px] text-brand-300">@{activeGroup.inviteSlug}</p>
          ) : null}
        </div>
        <Button variant="secondary" className="min-h-9 shrink-0 px-3 text-xs" onClick={onOpenSettings}>
          {t('lobby.settings')}
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-surface/60 p-2">
          <p className="text-[10px] text-text-secondary">{t('groupLobby.statPlayers')}</p>
          <p className="text-lg font-bold tabular-nums">{stats.players}</p>
        </div>
        <div className="rounded-lg bg-surface/60 p-2">
          <p className="text-[10px] text-text-secondary">{t('groupLobby.statMatches')}</p>
          <p className="text-lg font-bold tabular-nums">{stats.matches}</p>
        </div>
        <div className="rounded-lg bg-surface/60 p-2">
          <p className="text-[10px] text-text-secondary">{t('groupLobby.statSessions')}</p>
          <p className="text-lg font-bold tabular-nums">{stats.sessions}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-surface/50 px-2.5 py-2">
        <p className="min-w-0 truncate text-[11px] text-text-secondary">{syncLine}</p>
        {pendingCount > 0 || settings.lastGroupSyncError ? (
          <Button
            variant="ghost"
            className="min-h-7 shrink-0 px-2 text-[10px]"
            onClick={() => settings.lastGroupCode && flushGroupCollabSyncNow(settings.lastGroupCode)}
          >
            {t('systemStatus.retrySync')}
          </Button>
        ) : null}
      </div>
    </section>
  )
}

function workspaceLabel(item: WorkspaceDescriptor, t: (key: import('@/lib/i18n').TranslationKey) => string) {
  if (item.kind === 'local') return t('workspace.local')
  return item.displayName
}

function PublicGroupCardButton({
  group,
  busy,
  onOpen,
}: {
  group: PublicGroupCard
  busy: boolean
  onOpen: (group: PublicGroupCard) => void
}) {
  const { t } = useI18n()
  const handle = group.inviteSlug ? `@${group.inviteSlug}` : group.publicId

  return (
    <button
      type="button"
      disabled={busy}
      className="w-full rounded-xl bg-surface-elevated p-3 text-left ring-1 ring-surface-muted transition hover:bg-surface-muted active:scale-[0.99]"
      onClick={() => onOpen(group)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{group.displayName}</p>
          <p className="mt-0.5 font-mono text-[11px] text-brand-300">{handle}</p>
        </div>
        {group.isMember ? (
          <span className="shrink-0 rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-semibold text-brand-200">
            {t('lobby.joinedBadge')}
          </span>
        ) : group.joinStatus === 'pending' ? (
          <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
            {t('lobby.pendingBadge')}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-text-secondary">
        {t('lobby.statLine')
          .replace('{players}', String(group.stats.players))
          .replace('{matches}', String(group.stats.matches))
          .replace('{sessions}', String(group.stats.sessions))}
      </p>
      <p className="mt-1 text-[10px] text-text-secondary">
        {t(joinPolicyLabelKey(group.joinPolicy))}
        {group.stats.lastActiveAt ? ` · ${formatDateTime(group.stats.lastActiveAt)}` : ''}
      </p>
    </button>
  )
}

function GroupDetailView({
  group,
  busy,
  onBack,
  onJoined,
}: {
  group: PublicGroupCard
  busy: boolean
  onBack: () => void
  onJoined: (storageCode: string) => Promise<void>
}) {
  const { t } = useI18n()
  const toast = useToast()
  const [message, setMessage] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const handle = group.inviteSlug ? `@${group.inviteSlug}` : group.publicId

  const handleJoin = async () => {
    try {
      const result = await joinGroupWithPolicy(group.publicId || group.storageCode, {
        message,
        inviteToken: group.joinPolicy === 'invite_only' ? inviteToken : undefined,
      })
      if (!result.ok) {
        const errKey = `lobby.error.${result.error}` as import('@/lib/i18n').TranslationKey
        toast.error(t(errKey) || result.error || t('lobby.joinFailed'))
        return
      }
      if (result.pending) {
        toast.info(t('lobby.requestSent'))
        onBack()
        return
      }
      if (result.joined && result.storageCode) {
        toast.success(t('lobby.joined'))
        await onJoined(result.storageCode)
      }
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('lobby.joinFailed'))
    }
  }

  return (
    <div className="space-y-3">
      <Button variant="ghost" className="min-h-10 py-2 text-sm" onClick={onBack}>
        ← {t('lobby.backToBrowse')}
      </Button>

      <section className="rounded-xl bg-surface-elevated p-4 ring-1 ring-surface-muted">
        <h3 className="text-lg font-bold">{group.displayName}</h3>
        <p className="mt-1 font-mono text-sm text-brand-300">{handle}</p>
        <p className="mt-2 text-xs text-text-secondary">{t(visibilityLabelKey(group.visibility))}</p>
        <p className="mt-1 text-xs text-text-secondary">{t(joinPolicyLabelKey(group.joinPolicy))}</p>
        {group.description ? <p className="mt-3 text-sm text-text-primary">{group.description}</p> : null}

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-surface p-2">
            <p className="text-[10px] text-text-secondary">{t('groupLobby.statPlayers')}</p>
            <p className="text-lg font-bold tabular-nums">{group.stats.players}</p>
          </div>
          <div className="rounded-lg bg-surface p-2">
            <p className="text-[10px] text-text-secondary">{t('groupLobby.statMatches')}</p>
            <p className="text-lg font-bold tabular-nums">{group.stats.matches}</p>
          </div>
          <div className="rounded-lg bg-surface p-2">
            <p className="text-[10px] text-text-secondary">{t('groupLobby.statSessions')}</p>
            <p className="text-lg font-bold tabular-nums">{group.stats.sessions}</p>
          </div>
        </div>

        {!group.isMember && group.joinStatus !== 'pending' ? (
          <div className="mt-4 space-y-3">
            {group.joinPolicy === 'request' ? (
              <label className="block text-xs text-text-secondary">
                {t('lobby.requestMessage')}
                <textarea
                  className="mt-1 min-h-16 w-full rounded-xl border border-surface-muted bg-surface px-3 py-2 text-sm"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={t('lobby.requestMessagePlaceholder')}
                />
              </label>
            ) : null}
            {group.joinPolicy === 'invite_only' ? (
              <label className="block text-xs text-text-secondary">
                {t('lobby.inviteToken')}
                <input
                  className="mt-1 min-h-10 w-full rounded-xl border border-surface-muted bg-surface px-3 text-sm"
                  value={inviteToken}
                  onChange={(event) => setInviteToken(event.target.value)}
                />
              </label>
            ) : null}
            <Button fullWidth loading={busy} disabled={busy} onClick={() => void handleJoin()}>
              {group.joinPolicy === 'open' ? t('lobby.joinNow') : t('lobby.applyJoin')}
            </Button>
          </div>
        ) : group.joinStatus === 'pending' ? (
          <p className="mt-4 rounded-xl bg-warning/10 p-3 text-sm text-warning">{t('lobby.pendingNote')}</p>
        ) : (
          <Button fullWidth className="mt-4" disabled={busy} onClick={() => void onJoined(group.storageCode)}>
            {t('lobby.enterGroup')}
          </Button>
        )}
      </section>
    </div>
  )
}

export function GroupLobbyHub({ onClose, onNavigate, initialTab }: GroupLobbyHubProps) {
  const { t } = useI18n()
  const toast = useToast()

  const lastGroupCode = useAppStore((state) => state.settings.lastGroupCode)
  const cloudUserId = useAppStore((state) => state.settings.cloudUserId)

  const switchWorkspace = useAppStore((state) => state.switchWorkspace)

  const [tab, setTab] = useState<LobbyTab>(initialTab ?? (lastGroupCode ? 'home' : 'search'))
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [sort, setSort] = useState<LobbySort>('active')
  const [workspaceItems, setWorkspaceItems] = useState<WorkspaceDescriptor[]>([])
  const [publicGroups, setPublicGroups] = useState<PublicGroupCard[]>([])
  const [selected, setSelected] = useState<PublicGroupCard | null>(null)
  const [loadingHome, setLoadingHome] = useState(false)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchFetched, setSearchFetched] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [switchBusyId, setSwitchBusyId] = useState<string | null>(null)
  const searchRequestRef = useRef(0)

  const configured = isCloudConfigured()

  useEffect(() => subscribeSyncPendingCount((count) => {
    setWorkspaceItems((items) =>
      items.map((item) => (item.isActive ? { ...item, pendingCount: count } : item)),
    )
  }), [])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 450)
    return () => window.clearTimeout(timer)
  }, [query])

  const loadHome = useCallback(async () => {
    if (!configured) {
      setWorkspaceItems([])
      setLoggedIn(false)
      return
    }
    setLoadingHome(true)
    try {
      const { user } = await getCloudSession()
      setLoggedIn(Boolean(user))
      if (!user) {
        setWorkspaceItems([])
        return
      }
      const memberships = await listMyGroupMemberships().catch(() => [])
      const items = await buildWorkspaceList(
        getAppState().settings,
        getCachedSyncPendingCount(),
        memberships,
      )
      setWorkspaceItems(items)
      const hasGroups = items.some((item) => item.kind === 'group')
      setTab((current) => (current === 'home' && !hasGroups ? 'search' : current))
    } finally {
      setLoadingHome(false)
    }
  }, [configured, lastGroupCode, cloudUserId])

  useEffect(() => {
    void loadHome()
  }, [loadHome])

  const loadPublic = useCallback(async () => {
    if (!configured || !loggedIn) return
    const requestId = ++searchRequestRef.current
    setLoadingSearch(true)
    setSearchError(null)
    try {
      if (debouncedQuery) {
        const resolved = await resolveGroupLookup(debouncedQuery)
        if (requestId !== searchRequestRef.current) return
        if (resolved) {
          setPublicGroups([resolved])
          setSearchFetched(true)
          return
        }
      }
      const rows = await searchPublicGroups({ query: debouncedQuery, sort, limit: 32 })
      if (requestId !== searchRequestRef.current) return
      setPublicGroups(rows)
      setSearchFetched(true)
    } catch (caught) {
      if (requestId !== searchRequestRef.current) return
      setPublicGroups([])
      setSearchError(caught instanceof Error ? caught.message : t('lobby.loadFailed'))
      setSearchFetched(true)
    } finally {
      if (requestId === searchRequestRef.current) {
        setLoadingSearch(false)
      }
    }
  }, [configured, debouncedQuery, loggedIn, sort, t])

  useEffect(() => {
    if (tab !== 'search' || !loggedIn) return
    void loadPublic()
  }, [tab, loggedIn, debouncedQuery, sort, loadPublic])

  const activeGroup = useMemo(
    () => workspaceItems.find((item) => item.isActive && item.kind === 'group') ?? null,
    [workspaceItems],
  )
  const myGroups = useMemo(
    () => workspaceItems.filter((item) => item.kind === 'group'),
    [workspaceItems],
  )

  const sortOptions = useMemo(
    () =>
      [
        { id: 'active' as const, label: t('lobby.sortActive') },
        { id: 'matches' as const, label: t('lobby.sortMatches') },
        { id: 'players' as const, label: t('lobby.sortPlayers') },
      ] satisfies Array<{ id: LobbySort; label: string }>,
    [t],
  )

  const handleSwitch = async (item: WorkspaceDescriptor) => {
    if (item.isActive) return
    setSwitchBusyId(item.id)
    try {
      if (item.kind === 'local') {
        await switchWorkspace('local')
      } else if (item.groupCode) {
        await switchWorkspace(item.groupCode)
      }
      toast.success(t('workspace.switched'))
      onClose?.()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('workspace.switchFailed'))
    } finally {
      setSwitchBusyId(null)
    }
  }

  const handleJoined = async (storageCode: string) => {
    setSwitchBusyId('join')
    try {
      await switchWorkspace(storageCode, { preserveCollabForInit: true })
      toast.success(t('workspace.switched'))
      setTab('home')
      setSelected(null)
      onClose?.()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('workspace.switchFailed'))
    } finally {
      setSwitchBusyId(null)
    }
  }

  if (!configured) {
    return <p className="text-sm text-text-secondary">{t('cloud.notConfigured')}</p>
  }

  if (!loggedIn && !loadingHome) {
    return <p className="text-sm text-text-secondary">{t('lobby.loginRequired')}</p>
  }

  if (selected) {
    return (
      <GroupDetailView
        group={selected}
        busy={switchBusyId !== null}
        onBack={() => setSelected(null)}
        onJoined={handleJoined}
      />
    )
  }

  const tabButtonClass = (value: LobbyTab) =>
    [
      'flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition',
      tab === value
        ? 'bg-brand-500 text-white'
        : 'bg-surface-elevated text-text-secondary ring-1 ring-surface-muted',
    ].join(' ')

  if (tab === 'home') {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <button type="button" className={tabButtonClass('home')} onClick={() => setTab('home')}>
            {t('lobby.tabHome')}
          </button>
          <button type="button" className={tabButtonClass('search')} onClick={() => setTab('search')}>
            {t('lobby.tabSearch')}
          </button>
        </div>

        {loadingHome && !activeGroup ? (
          <p className="text-sm text-text-secondary">{t('lobby.loading')}</p>
        ) : null}

        {activeGroup ? (
          <GroupClanInfoCard activeGroup={activeGroup} onOpenSettings={() => setSettingsOpen(true)} />
        ) : (
          <section className="rounded-xl bg-surface-elevated p-4 ring-1 ring-surface-muted">
            <p className="text-sm text-text-secondary">{t('lobby.noActiveClan')}</p>
            <Button fullWidth className="mt-3" onClick={() => setTab('search')}>
              {t('lobby.openSearch')}
            </Button>
          </section>
        )}

        {lastGroupCode ? (
          <GroupClanRoster onSession={onNavigate ? () => onNavigate('session') : undefined} />
        ) : null}

        <BottomSheet open={settingsOpen} title={t('lobby.settings')} onClose={() => setSettingsOpen(false)} manageScroll>
          <GroupLobbyPanel settingsOnly />
        </BottomSheet>

        {myGroups.length > 1 ? (
          <section className="space-y-1.5">
            <p className="text-xs font-semibold text-text-secondary">{t('lobby.switchGroup')}</p>
            <ul className="space-y-1.5">
              {myGroups.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={switchBusyId !== null || item.isActive}
                    className={[
                      'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition',
                      item.isActive
                        ? 'bg-surface-muted ring-1 ring-brand-500/40'
                        : 'bg-surface-elevated ring-1 ring-surface-muted hover:bg-surface-muted',
                    ].join(' ')}
                    onClick={() => void handleSwitch(item)}
                  >
                    <span>
                      <span className="font-semibold">{workspaceLabel(item, t)}</span>
                      {item.role ? (
                        <span className="mt-0.5 block text-xs text-text-secondary">{groupRoleLabel(item.role)}</span>
                      ) : null}
                    </span>
                    {item.isActive ? (
                      <span className="text-xs text-brand-400">{t('workspace.active')}</span>
                    ) : switchBusyId === item.id ? (
                      <span className="text-xs text-text-secondary">…</span>
                    ) : (
                      <span className="text-xs text-text-secondary">›</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Button variant="secondary" fullWidth onClick={() => setTab('search')}>
          {t('lobby.openSearch')}
        </Button>

        <button
          type="button"
          className="w-full rounded-xl bg-surface-elevated px-3 py-2.5 text-left text-sm ring-1 ring-surface-muted"
          disabled={switchBusyId !== null}
          onClick={() => {
            const local = workspaceItems.find((item) => item.kind === 'local')
            if (local) void handleSwitch(local)
          }}
        >
          <span className="font-semibold">{t('workspace.local')}</span>
          <span className="mt-0.5 block text-xs text-text-secondary">{t('workspace.localDataNote')}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button type="button" className={tabButtonClass('home')} onClick={() => setTab('home')}>
          {t('lobby.tabHome')}
        </button>
        <button type="button" className={tabButtonClass('search')} onClick={() => setTab('search')}>
          {t('lobby.tabSearch')}
        </button>
      </div>

      <input
        className="min-h-11 w-full rounded-xl border border-surface-muted bg-surface px-3 text-sm"
        placeholder={t('lobby.searchPlaceholder')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="flex flex-wrap gap-1.5">
        {sortOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={[
              'rounded-full px-3 py-1 text-xs font-semibold transition',
              sort === option.id
                ? 'bg-brand-500 text-white'
                : 'bg-surface-elevated text-text-secondary ring-1 ring-surface-muted',
            ].join(' ')}
            onClick={() => setSort(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {myGroups.length > 0 ? (
        <section className="space-y-1.5">
          <p className="text-xs font-semibold text-text-secondary">{t('lobby.myGroups')}</p>
          <ul className="space-y-1.5">
            {myGroups.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={switchBusyId !== null}
                  className="flex w-full items-center justify-between rounded-xl bg-brand-500/10 px-3 py-2 text-left text-sm ring-1 ring-brand-500/20"
                  onClick={() => (item.isActive ? setTab('home') : void handleSwitch(item))}
                >
                  <span className="font-semibold">{workspaceLabel(item, t)}</span>
                  <span className="text-xs text-brand-300">{item.isActive ? t('workspace.active') : '›'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs font-semibold text-text-secondary">{t('lobby.publicBrowse')}</p>

      {loadingSearch && !searchFetched ? (
        <p className="text-sm text-text-secondary">{t('lobby.loading')}</p>
      ) : searchError ? (
        <div className="rounded-xl bg-danger/10 p-4 text-sm text-red-200">
          <p>{searchError}</p>
          <p className="mt-2 text-xs text-text-secondary">{t('lobby.emptyPublicHint')}</p>
        </div>
      ) : publicGroups.length ? (
        <ul className="space-y-2">
          {publicGroups.map((group) => (
            <li key={group.groupKey}>
              <PublicGroupCardButton group={group} busy={switchBusyId !== null} onOpen={setSelected} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-surface-elevated p-4 text-sm text-text-secondary">
          {searchFetched ? t('lobby.emptyPublicHint') : t('lobby.empty')}
        </p>
      )}
    </div>
  )
}
