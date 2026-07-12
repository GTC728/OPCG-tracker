import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { fetchGroupRegistry, isValidInviteSlug, normalizeInviteSlug, updateGroupRegistry } from '@/lib/groupRegistry'
import { useI18n } from '@/lib/i18n'
import { useAppStore } from '@/stores/appStore'

export function GroupLobbyPanel() {
  const { t } = useI18n()
  const toast = useToast()
  const groupCode = useAppStore((state) => state.settings.lastGroupCode)
  const role = useAppStore((state) => state.settings.groupMemberRole)
  const [displayName, setDisplayName] = useState('')
  const [inviteSlug, setInviteSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const isOwner = role === 'owner'

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

  return (
    <section className="rounded-xl bg-surface-elevated p-4 ring-1 ring-surface-muted">
      <h3 className="text-sm font-semibold">{t('groupLobby.title')}</h3>
      <p className="mt-1 text-xs text-text-secondary">{t('groupLobby.desc')}</p>

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

        <p className="text-[11px] text-text-secondary">
          {t('groupLobby.codeHint')}: <span className="font-mono">{groupCode}</span>
        </p>

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
