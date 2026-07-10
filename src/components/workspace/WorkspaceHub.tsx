import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { GroupMembershipPanel } from '@/components/settings/GroupMembershipPanel'
import { GroupSyncSection } from '@/components/settings/GroupSyncSection'
import { useToast } from '@/components/ui/Toast'
import { groupRoleLabel } from '@/lib/groupPermissions'
import { useI18n } from '@/lib/i18n'
import { getCachedSyncPendingCount, subscribeSyncPendingCount } from '@/lib/syncQueue'
import { buildWorkspaceList, type WorkspaceDescriptor } from '@/lib/workspace'
import { useAppStore } from '@/stores/appStore'

interface WorkspaceHubProps {
  compact?: boolean
  onNavigate?: (section: 'session' | 'players' | 'members' | 'sync' | 'join') => void
  onClose?: () => void
}

function workspaceLabel(item: WorkspaceDescriptor, t: (key: import('@/lib/i18n').TranslationKey) => string) {
  if (item.kind === 'local') return t('workspace.local')
  return item.displayName
}

export function WorkspaceHub({ compact = false, onNavigate, onClose }: WorkspaceHubProps) {
  const { t } = useI18n()
  const toast = useToast()
  const settings = useAppStore((state) => state.settings)
  const switchWorkspace = useAppStore((state) => state.switchWorkspace)
  const [pendingCount, setPendingCount] = useState(getCachedSyncPendingCount())
  const [items, setItems] = useState<WorkspaceDescriptor[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showJoin, setShowJoin] = useState(false)

  useEffect(() => subscribeSyncPendingCount(setPendingCount), [])

  useEffect(() => {
    void buildWorkspaceList(settings, pendingCount).then(setItems)
  }, [settings, pendingCount])

  const active = useMemo(() => items.find((item) => item.isActive), [items])

  const handleSwitch = async (item: WorkspaceDescriptor) => {
    if (item.isActive) return
    setBusyId(item.id)
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
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-3">
      {active ? (
        <section className="rounded-xl bg-brand-500/10 p-3 ring-1 ring-brand-500/25">
          <p className="text-xs font-semibold text-brand-100">{t('workspace.current')}</p>
          <p className="mt-1 text-base font-bold text-text-primary">{workspaceLabel(active, t)}</p>
          {active.role ? (
            <p className="mt-0.5 text-xs text-text-secondary">{groupRoleLabel(active.role)}</p>
          ) : null}
          {active.kind === 'group' ? (
            <p className="mt-1 text-[11px] text-text-secondary">{t('workspace.groupDataNote')}</p>
          ) : (
            <p className="mt-1 text-[11px] text-text-secondary">{t('workspace.localDataNote')}</p>
          )}
        </section>
      ) : null}

      {!compact && onNavigate ? (
        <section className="space-y-1.5">
          <p className="text-xs font-semibold text-text-secondary">{t('workspace.manage')}</p>
          <Button variant="secondary" fullWidth className="min-h-10 justify-start text-sm" onClick={() => onNavigate('session')}>
            {t('settings.session')}
          </Button>
          <Button variant="secondary" fullWidth className="min-h-10 justify-start text-sm" onClick={() => onNavigate('players')}>
            {t('settings.players')}
          </Button>
          {settings.lastGroupCode ? (
            <Button variant="secondary" fullWidth className="min-h-10 justify-start text-sm" onClick={() => onNavigate('members')}>
              {t('members.title')}
            </Button>
          ) : null}
          <Button variant="secondary" fullWidth className="min-h-10 justify-start text-sm" onClick={() => onNavigate('sync')}>
            {t('workspace.syncStatus')}
          </Button>
          {!settings.lastGroupCode ? (
            <Button variant="secondary" fullWidth className="min-h-10 justify-start text-sm" onClick={() => onNavigate('join')}>
              {t('cloud.joinGroup')}
            </Button>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-1.5">
        <p className="text-xs font-semibold text-text-secondary">{t('workspace.switchTitle')}</p>
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                disabled={busyId !== null || item.isActive}
                className={[
                  'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition',
                  item.isActive
                    ? 'bg-surface-muted ring-1 ring-brand-500/40'
                    : 'bg-surface-elevated ring-1 ring-surface-muted hover:bg-surface-muted active:scale-[0.99]',
                ].join(' ')}
                onClick={() => void handleSwitch(item)}
              >
                <span>
                  <span className="font-semibold">{workspaceLabel(item, t)}</span>
                  {item.role ? (
                    <span className="mt-0.5 block text-xs text-text-secondary">
                      {groupRoleLabel(item.role)}
                    </span>
                  ) : null}
                </span>
                {item.isActive ? (
                  <span className="text-xs text-brand-400">{t('workspace.active')}</span>
                ) : busyId === item.id ? (
                  <span className="text-xs text-text-secondary">…</span>
                ) : (
                  <span className="text-xs text-text-secondary">›</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {compact && !settings.lastGroupCode && !showJoin ? (
        <Button variant="secondary" fullWidth onClick={() => setShowJoin(true)}>
          {t('cloud.joinGroup')}
        </Button>
      ) : null}

      {compact && showJoin ? <GroupMembershipPanel /> : null}

      {compact && settings.lastGroupCode ? <GroupSyncSection compact /> : null}
    </div>
  )
}
