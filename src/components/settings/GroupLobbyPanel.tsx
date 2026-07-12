import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { fetchGroupRegistry, isValidInviteSlug, normalizeInviteSlug, updateGroupRegistry } from '@/lib/groupRegistry'
import { getCompletedMatches } from '@/lib/stats'
import { useI18n } from '@/lib/i18n'
import { useAppStore } from '@/stores/appStore'

export function GroupLobbyPanel() {
  const { t } = useI18n()
  const toast = useToast()
  const groupCode = useAppStore((state) => state.settings.lastGroupCode)
  const role = useAppStore((state) => state.settings.groupMemberRole)
  const players = useAppStore((state) => state.players)
  const matches = useAppStore((state) => state.matches)
  const sessions = useAppStore((state) => state.sessions)
  const [displayName, setDisplayName] = useState('')
  const [inviteSlug, setInviteSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const isOwner = role === 'owner'

  const lobbyStats = useMemo(() => {
    const completed = getCompletedMatches(matches)
    const activePlayers = players.filter((player) => !player.archived && !player.deletedAt).length
    return {
      matches: completed.length,
      players: activePlayers,
      sessions: sessions.filter((session) => !session.deletedAt).length,
    }
  }, [matches, players, sessions])

  useEffect(() => {
    if (!groupCode) return
    void fetchGroupRegistry(groupCode)
      .then((profile) => {
        if (!profile) return
        setDisplayName(profile.displayName)
        setInviteSlug(profile.inviteSlug ?? '')
      })
      .catch(() => {
        if (groupCode) setDisplayName(groupCode.toUpperCase())
      })
  }, [groupCode])

  if (!groupCode) return null

  const handleSave = async () => {
    if (!isOwner) return
    setBusy(true)
    try {
      await updateGroupRegistry(groupCode, {
        displayName,
        inviteSlug: inviteSlug.trim() ? normalizeInviteSlug(inviteSlug) : null,
      })
      toast.success(t('groupLobby.saved'))
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('groupLobby.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const publicHandle = inviteSlug.trim() ? `@${normalizeInviteSlug(inviteSlug)}` : null

  return (
    <section className="rounded-xl bg-surface-elevated p-4 ring-1 ring-surface-muted">
      <h3 className="text-sm font-semibold">{t('groupLobby.title')}</h3>
      <p className="mt-1 text-xs text-text-secondary">{t('groupLobby.descV422')}</p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-surface p-2">
          <p className="text-[10px] text-text-secondary">{t('groupLobby.statPlayers')}</p>
          <p className="text-lg font-bold tabular-nums">{lobbyStats.players}</p>
        </div>
        <div className="rounded-lg bg-surface p-2">
          <p className="text-[10px] text-text-secondary">{t('groupLobby.statMatches')}</p>
          <p className="text-lg font-bold tabular-nums">{lobbyStats.matches}</p>
        </div>
        <div className="rounded-lg bg-surface p-2">
          <p className="text-[10px] text-text-secondary">{t('groupLobby.statSessions')}</p>
          <p className="text-lg font-bold tabular-nums">{lobbyStats.sessions}</p>
        </div>
      </div>

      {publicHandle ? (
        <p className="mt-3 text-xs text-text-secondary">
          {t('groupLobby.publicHandle')}: <span className="font-mono text-brand-300">{publicHandle}</span>
        </p>
      ) : (
        <p className="mt-3 text-xs text-text-secondary">{t('groupLobby.publicHandlePending')}</p>
      )}

      <div className="mt-3 space-y-3">
        <label className="block text-xs text-text-secondary">
          {t('groupLobby.displayName')}
          <input
            className="mt-1 min-h-10 w-full rounded-xl border border-surface-muted bg-surface px-3 text-sm"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            disabled={!isOwner || busy}
          />
        </label>

        <label className="block text-xs text-text-secondary">
          {t('groupLobby.inviteSlug')}
          <input
            className="mt-1 min-h-10 w-full rounded-xl border border-surface-muted bg-surface px-3 text-sm"
            placeholder={t('groupLobby.inviteSlugPlaceholder')}
            value={inviteSlug}
            onChange={(event) => setInviteSlug(event.target.value)}
            disabled={!isOwner || busy}
          />
          {inviteSlug.trim() && !isValidInviteSlug(normalizeInviteSlug(inviteSlug)) ? (
            <span className="mt-1 block text-[11px] text-warning">{t('groupLobby.slugInvalid')}</span>
          ) : null}
        </label>

        {isOwner ? (
          <Button fullWidth disabled={busy || !displayName.trim()} loading={busy} onClick={() => void handleSave()}>
            {t('groupLobby.save')}
          </Button>
        ) : (
          <p className="text-xs text-text-secondary">{t('groupLobby.ownerOnly')}</p>
        )}
      </div>
    </section>
  )
}
