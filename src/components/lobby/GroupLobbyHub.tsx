import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { getCloudSession, isCloudConfigured } from '@/lib/cloudSync'
import {
  joinGroupWithPolicy,
  joinPolicyLabelKey,
  resolveGroupLookup,
  searchPublicGroups,
  visibilityLabelKey,
  type PublicGroupCard,
} from '@/lib/groupLobby'
import { useI18n } from '@/lib/i18n'
import { formatDateTime } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'

type LobbySort = 'active' | 'matches' | 'players'

function GroupCard({
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
        toast.error(t(`lobby.error.${result.error}` as import('@/lib/i18n').TranslationKey) || result.error || t('lobby.joinFailed'))
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
        {group.description ? (
          <p className="mt-3 text-sm text-text-primary">{group.description}</p>
        ) : null}

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

export function GroupLobbyHub({ onClose }: { onClose?: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const switchWorkspace = useAppStore((state) => state.switchWorkspace)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<LobbySort>('active')
  const [groups, setGroups] = useState<PublicGroupCard[]>([])
  const [selected, setSelected] = useState<PublicGroupCard | null>(null)
  const [busy, setBusy] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const configured = isCloudConfigured()

  const loadGroups = useCallback(async () => {
    if (!configured) {
      setGroups([])
      return
    }
    const { user } = await getCloudSession()
    setLoggedIn(Boolean(user))
    if (!user) {
      setGroups([])
      return
    }
    setBusy(true)
    try {
      if (query.trim()) {
        const resolved = await resolveGroupLookup(query.trim())
        if (resolved) {
          setGroups([resolved])
          return
        }
      }
      const rows = await searchPublicGroups({ query, sort, limit: 32 })
      setGroups(rows)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('lobby.loadFailed'))
    } finally {
      setBusy(false)
    }
  }, [configured, query, sort, t, toast])

  useEffect(() => {
    void loadGroups()
  }, [loadGroups])

  const sortOptions = useMemo(
    () =>
      [
        { id: 'active' as const, label: t('lobby.sortActive') },
        { id: 'matches' as const, label: t('lobby.sortMatches') },
        { id: 'players' as const, label: t('lobby.sortPlayers') },
      ] satisfies Array<{ id: LobbySort; label: string }>,
    [t],
  )

  const handleJoined = async (storageCode: string) => {
    setBusy(true)
    try {
      await switchWorkspace(storageCode, { preserveCollabForInit: true })
      toast.success(t('workspace.switched'))
      onClose?.()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('workspace.switchFailed'))
    } finally {
      setBusy(false)
    }
  }

  if (!configured) {
    return <p className="text-sm text-text-secondary">{t('cloud.notConfigured')}</p>
  }

  if (!loggedIn) {
    return <p className="text-sm text-text-secondary">{t('lobby.loginRequired')}</p>
  }

  if (selected) {
    return (
      <GroupDetailView
        group={selected}
        busy={busy}
        onBack={() => setSelected(null)}
        onJoined={handleJoined}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{t('lobby.title')}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t('lobby.desc')}</p>
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

      {busy && !groups.length ? (
        <p className="text-sm text-text-secondary">{t('lobby.loading')}</p>
      ) : groups.length ? (
        <ul className="space-y-2">
          {groups.map((group) => (
            <li key={group.groupKey}>
              <GroupCard group={group} busy={busy} onOpen={setSelected} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-surface-elevated p-4 text-sm text-text-secondary">{t('lobby.empty')}</p>
      )}
    </div>
  )
}
