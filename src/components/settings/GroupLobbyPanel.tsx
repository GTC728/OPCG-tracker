import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { listGroupMembers } from '@/lib/cloudSync'
import {
  canManageGroup,
  canTransferOwnership,
  groupRoleLabel,
} from '@/lib/groupPermissions'
import {
  createGroupInviteLink,
  joinPolicyLabelKey,
  listGroupJoinRequests,
  refreshGroupStatsSnapshot,
  resolveGroupLookup,
  reviewJoinRequest,
  transferGroupOwnership,
  updateGroupLobbySettings,
  visibilityLabelKey,
  type GroupJoinPolicy,
  type GroupJoinRequest,
  type GroupVisibility,
} from '@/lib/groupLobby'
import { fetchGroupRegistry, isValidInviteSlug, normalizeInviteSlug } from '@/lib/groupRegistry'
import { getCompletedMatches } from '@/lib/stats'
import { useI18n } from '@/lib/i18n'
import { useAppStore } from '@/stores/appStore'

export function GroupLobbyPanel() {
  const { t } = useI18n()
  const toast = useToast()
  const groupCode = useAppStore((state) => state.settings.lastGroupCode)
  const role = useAppStore((state) => state.settings.groupMemberRole)
  const cloudUserId = useAppStore((state) => state.settings.cloudUserId)
  const players = useAppStore((state) => state.players)
  const matches = useAppStore((state) => state.matches)
  const sessions = useAppStore((state) => state.sessions)
  const [displayName, setDisplayName] = useState('')
  const [publicId, setPublicId] = useState('')
  const [inviteSlug, setInviteSlug] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<GroupVisibility>('public')
  const [joinPolicy, setJoinPolicy] = useState<GroupJoinPolicy>('request')
  const [requests, setRequests] = useState<GroupJoinRequest[]>([])
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const canManage = canManageGroup(role)
  const canTransfer = canTransferOwnership(role)

  const lobbyStats = useMemo(() => {
    const completed = getCompletedMatches(matches)
    const activePlayers = players.filter((player) => !player.archived && !player.deletedAt).length
    return {
      matches: completed.length,
      players: activePlayers,
      sessions: sessions.filter((session) => !session.deletedAt).length,
    }
  }, [matches, players, sessions])

  const loadProfile = useCallback(async () => {
    if (!groupCode) return
    const [registry, lookup] = await Promise.all([
      fetchGroupRegistry(groupCode).catch(() => null),
      resolveGroupLookup(groupCode).catch(() => null),
    ])
    if (registry) {
      setDisplayName(registry.displayName)
      setInviteSlug(registry.inviteSlug ?? '')
    } else {
      setDisplayName(groupCode.toUpperCase())
    }
    if (lookup) {
      setPublicId(lookup.publicId)
      setDescription(lookup.description ?? '')
      setVisibility(lookup.visibility)
      setJoinPolicy(lookup.joinPolicy)
    } else {
      setPublicId(groupCode)
    }
    void refreshGroupStatsSnapshot(groupCode).catch(() => null)
  }, [groupCode])

  const loadRequests = useCallback(async () => {
    if (!groupCode || !canManage) return
    const rows = await listGroupJoinRequests(groupCode)
    setRequests(rows)
  }, [canManage, groupCode])

  useEffect(() => {
    void loadProfile()
    void loadRequests()
  }, [loadProfile, loadRequests])

  if (!groupCode) return null

  const handleSave = async () => {
    if (!canManage) return
    setBusy(true)
    try {
      await updateGroupLobbySettings(groupCode, {
        displayName,
        publicId: publicId.trim() || groupCode,
        inviteSlug: inviteSlug.trim() ? normalizeInviteSlug(inviteSlug) : null,
        description,
        visibility,
        joinPolicy,
      })
      toast.success(t('groupLobby.saved'))
      void loadProfile()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('groupLobby.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const handleReview = async (requestId: string, approve: boolean) => {
    setBusy(true)
    try {
      const result = await reviewJoinRequest(requestId, approve)
      if (!result.ok) throw new Error(result.error ?? 'review_failed')
      toast.success(approve ? t('lobby.requestApproved') : t('lobby.requestRejected'))
      await loadRequests()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('lobby.reviewFailed'))
    } finally {
      setBusy(false)
    }
  }

  const handleCreateInvite = async () => {
    setBusy(true)
    try {
      const token = await createGroupInviteLink(groupCode, { expiresHours: 168 })
      setInviteLink(token)
      toast.success(t('lobby.inviteLinkCreated'))
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('lobby.inviteLinkFailed'))
    } finally {
      setBusy(false)
    }
  }

  const handleTransfer = async (userId: string) => {
    if (!canTransfer) return
    setBusy(true)
    try {
      await transferGroupOwnership(groupCode, userId)
      toast.success(t('lobby.ownershipTransferred'))
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('lobby.transferFailed'))
    } finally {
      setBusy(false)
    }
  }

  const publicHandle = inviteSlug.trim() ? `@${normalizeInviteSlug(inviteSlug)}` : publicId

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-surface-elevated p-4 ring-1 ring-surface-muted">
        <h3 className="text-sm font-semibold">{t('groupLobby.title')}</h3>
        <p className="mt-1 text-xs text-text-secondary">{t('groupLobby.descV5')}</p>

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

        <p className="mt-3 text-xs text-text-secondary">
          {t('groupLobby.publicHandle')}: <span className="font-mono text-brand-300">{publicHandle}</span>
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          {t(visibilityLabelKey(visibility))} · {t(joinPolicyLabelKey(joinPolicy))}
        </p>
      </div>

      {canManage ? (
        <div className="rounded-xl bg-surface-elevated p-4 ring-1 ring-surface-muted space-y-3">
          <h4 className="text-sm font-semibold">{t('lobby.adminSettings')}</h4>

          <label className="block text-xs text-text-secondary">
            {t('groupLobby.displayName')}
            <input
              className="mt-1 min-h-10 w-full rounded-xl border border-surface-muted bg-surface px-3 text-sm"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={busy}
            />
          </label>

          <label className="block text-xs text-text-secondary">
            {t('lobby.publicId')}
            <input
              className="mt-1 min-h-10 w-full rounded-xl border border-surface-muted bg-surface px-3 text-sm font-mono"
              value={publicId}
              onChange={(event) => setPublicId(event.target.value)}
              disabled={busy}
            />
          </label>

          <label className="block text-xs text-text-secondary">
            {t('groupLobby.inviteSlug')}
            <input
              className="mt-1 min-h-10 w-full rounded-xl border border-surface-muted bg-surface px-3 text-sm"
              placeholder={t('groupLobby.inviteSlugPlaceholder')}
              value={inviteSlug}
              onChange={(event) => setInviteSlug(event.target.value)}
              disabled={busy}
            />
            {inviteSlug.trim() && !isValidInviteSlug(normalizeInviteSlug(inviteSlug)) ? (
              <span className="mt-1 block text-[11px] text-warning">{t('groupLobby.slugInvalid')}</span>
            ) : null}
          </label>

          <label className="block text-xs text-text-secondary">
            {t('lobby.description')}
            <textarea
              className="mt-1 min-h-16 w-full rounded-xl border border-surface-muted bg-surface px-3 py-2 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={busy}
            />
          </label>

          <label className="block text-xs text-text-secondary">
            {t('lobby.visibility')}
            <select
              className="mt-1 min-h-10 w-full rounded-xl border border-surface-muted bg-surface px-3 text-sm"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as GroupVisibility)}
              disabled={busy}
            >
              <option value="public">{t('lobby.visibilityPublic')}</option>
              <option value="unlisted">{t('lobby.visibilityUnlisted')}</option>
              <option value="private">{t('lobby.visibilityPrivate')}</option>
            </select>
          </label>

          <label className="block text-xs text-text-secondary">
            {t('lobby.joinPolicy')}
            <select
              className="mt-1 min-h-10 w-full rounded-xl border border-surface-muted bg-surface px-3 text-sm"
              value={joinPolicy}
              onChange={(event) => setJoinPolicy(event.target.value as GroupJoinPolicy)}
              disabled={busy}
            >
              <option value="open">{t('lobby.policyOpen')}</option>
              <option value="request">{t('lobby.policyRequest')}</option>
              <option value="invite_only">{t('lobby.policyInviteOnly')}</option>
            </select>
          </label>

          <Button fullWidth disabled={busy || !displayName.trim()} loading={busy} onClick={() => void handleSave()}>
            {t('groupLobby.save')}
          </Button>

          {joinPolicy === 'invite_only' ? (
            <Button variant="secondary" fullWidth disabled={busy} onClick={() => void handleCreateInvite()}>
              {t('lobby.createInviteLink')}
            </Button>
          ) : null}
          {inviteLink ? (
            <p className="break-all rounded-lg bg-surface p-2 font-mono text-[11px] text-brand-300">{inviteLink}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-text-secondary">{t('groupLobby.ownerOnly')}</p>
      )}

      {canManage && requests.length ? (
        <div className="rounded-xl bg-surface-elevated p-4 ring-1 ring-surface-muted">
          <h4 className="text-sm font-semibold">{t('lobby.pendingRequests')}</h4>
          <ul className="mt-2 space-y-2">
            {requests.map((request) => (
              <li key={request.id} className="rounded-lg bg-surface p-3 ring-1 ring-surface-muted">
                <p className="text-sm font-semibold">{request.displayName}</p>
                {request.message ? <p className="mt-1 text-xs text-text-secondary">{request.message}</p> : null}
                <div className="mt-2 flex gap-2">
                  <Button
                    className="min-h-8 flex-1 text-xs"
                    disabled={busy}
                    onClick={() => void handleReview(request.id, true)}
                  >
                    {t('lobby.approve')}
                  </Button>
                  <Button
                    variant="secondary"
                    className="min-h-8 flex-1 text-xs"
                    disabled={busy}
                    onClick={() => void handleReview(request.id, false)}
                  >
                    {t('lobby.reject')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canTransfer ? (
        <TransferOwnershipSection
          groupCode={groupCode}
          cloudUserId={cloudUserId}
          busy={busy}
          onTransfer={handleTransfer}
        />
      ) : null}
    </section>
  )
}

function TransferOwnershipSection({
  groupCode,
  cloudUserId,
  busy,
  onTransfer,
}: {
  groupCode: string
  cloudUserId: string | null
  busy: boolean
  onTransfer: (userId: string) => Promise<void>
}) {
  const { t } = useI18n()
  const [members, setMembers] = useState<Array<{ userId: string; displayName: string; role: string }>>([])

  useEffect(() => {
    void listGroupMembers(groupCode).then((rows) => {
      setMembers(
        rows
          .filter((row) => row.userId !== cloudUserId && row.role !== 'owner')
          .map((row) => ({
            userId: row.userId,
            displayName: row.displayName ?? row.userId.slice(0, 8),
            role: groupRoleLabel(row.role),
          })),
      )
    })
  }, [cloudUserId, groupCode])

  if (!members.length) return null

  return (
    <div className="rounded-xl bg-surface-elevated p-4 ring-1 ring-surface-muted">
      <h4 className="text-sm font-semibold">{t('lobby.transferOwnership')}</h4>
      <p className="mt-1 text-xs text-text-secondary">{t('lobby.transferDesc')}</p>
      <ul className="mt-2 space-y-1.5">
        {members.map((member) => (
          <li key={member.userId} className="flex items-center justify-between gap-2 rounded-lg bg-surface p-2">
            <span className="text-sm">
              {member.displayName} <span className="text-xs text-text-secondary">({member.role})</span>
            </span>
            <Button
              variant="secondary"
              className="min-h-8 px-2 text-xs"
              disabled={busy}
              onClick={() => void onTransfer(member.userId)}
            >
              {t('lobby.makeOwner')}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
