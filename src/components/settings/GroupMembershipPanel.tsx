import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/lib/i18n'
import { getCloudSession, isCloudConfigured, joinGroupWithRole, loadGroupCloudState } from '@/lib/cloudSync'
import { groupRoleLabel } from '@/lib/groupPermissions'
import { formatDateTime } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'

export function GroupMembershipPanel() {
  const { t } = useI18n()
  const toast = useToast()
  const settings = useAppStore((state) => state.settings)
  const switchWorkspace = useAppStore((state) => state.switchWorkspace)
  const leaveGroupCollab = useAppStore((state) => state.leaveGroupCollab)
  const [groupCode, setGroupCode] = useState('')
  const [groupUpdatedAt, setGroupUpdatedAt] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const configured = isCloudConfigured()
  const connectedGroup = settings.lastGroupCode

  if (!configured) {
    return (
      <p className="text-sm text-text-secondary">{t('cloud.notConfigured')}</p>
    )
  }

  return (
    <section className="rounded-2xl bg-surface-elevated p-4">
      <h2 className="text-lg font-semibold">{t('workspace.groupTitle')}</h2>
      <p className="mt-1 text-sm text-text-secondary">{t('workspace.groupDesc')}</p>

      {connectedGroup ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-text-secondary">
            {t('cloud.groupLabel')}: {connectedGroup}
            {settings.groupMemberRole ? ` · ${groupRoleLabel(settings.groupMemberRole)}` : ''}
            {groupUpdatedAt ? ` · ${formatDateTime(groupUpdatedAt)}` : ''}
          </p>
          <p className="rounded-xl bg-brand-500/10 p-3 text-xs text-brand-100">{t('cloud.collabActiveNote')}</p>
          <Button
            variant="ghost"
            fullWidth
            disabled={busy}
            onClick={() => {
              void (async () => {
                setBusy(true)
                try {
                  await leaveGroupCollab()
                  setGroupCode('')
                  setGroupUpdatedAt(null)
                  setMessage(t('cloud.leftGroup'))
                  toast.info(t('cloud.leftGroup'))
                } catch (caught) {
                  const nextMessage =
                    caught instanceof Error ? caught.message : t('cloud.leaveGroupFailed')
                  setMessage(nextMessage)
                  toast.error(nextMessage)
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            {t('cloud.leaveGroup')}
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-text-secondary">{t('cloud.groupSecret')}</p>
          <input
            className="min-h-11 w-full rounded-xl border border-surface-muted bg-surface px-3"
            placeholder={t('workspace.groupCodePlaceholder')}
            value={groupCode}
            onChange={(event) => setGroupCode(event.target.value)}
          />
          <Button
            fullWidth
            disabled={busy || groupCode.trim().length < 8}
            loading={busy}
            onClick={async () => {
              setBusy(true)
              setMessage(null)
              try {
                const { user } = await getCloudSession()
                if (!user) throw new Error(t('cloud.loginRequired'))
                const code = groupCode.trim()
                await joinGroupWithRole(code)
                await switchWorkspace(code, { preserveCollabForInit: true })
                const latest = await loadGroupCloudState(code)
                setGroupUpdatedAt(latest?.updated_at ?? null)
                const nextMessage = latest ? t('cloud.joinedGroup') : t('cloud.joinedNewGroup')
                setMessage(nextMessage)
                toast.success(nextMessage)
              } catch (caught) {
                const nextMessage = caught instanceof Error ? caught.message : t('cloud.joinFailed')
                setMessage(nextMessage)
                toast.error(nextMessage)
              } finally {
                setBusy(false)
              }
            }}
          >
            {t('cloud.joinGroup')}
          </Button>
        </div>
      )}

      {message ? <p className="mt-3 text-sm text-text-secondary">{message}</p> : null}
    </section>
  )
}
