import { GroupSyncSection } from '@/components/settings/GroupSyncSection'
import { useI18n } from '@/lib/i18n'
import { uiCard } from '@/lib/uiSurface'
import type { AuditEntry, AuditKind } from '@/types'
import { useAppStore } from '@/stores/appStore'

const AUDIT_KIND_LABEL: Record<AuditKind, string> = {
  match_complete: '完成',
  match_undo: '還原',
  match_edit: '編輯',
  match_delete: '刪除',
  import: '匯入',
  import_revert: '撤銷',
  sync: '同步',
  session: '場次',
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  return (
    <li className="flex items-start gap-2 border-b border-[var(--ui-border)] py-2 last:border-0">
      <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
        {AUDIT_KIND_LABEL[entry.kind]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs">{entry.message}</p>
        <p className="mt-0.5 text-[10px] text-text-secondary">{formatAuditTime(entry.at)}</p>
      </div>
    </li>
  )
}

function formatAuditTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SystemStatusPanel() {
  const { t } = useI18n()
  const auditLog = useAppStore((state) => state.auditLog)

  return (
    <div className="space-y-3">
      <GroupSyncSection />

      <section className={[uiCard, 'p-3'].join(' ')}>
        <h3 className="text-sm font-semibold">{t('systemStatus.auditTitle')}</h3>
        <p className="mt-1 text-[11px] text-text-secondary">{t('systemStatus.auditDesc')}</p>
        {auditLog.length ? (
          <ol className="mt-2 max-h-64 overflow-y-auto">
            {auditLog.slice(0, 30).map((entry) => (
              <AuditRow key={entry.id} entry={entry} />
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-xs text-text-secondary">{t('systemStatus.auditEmpty')}</p>
        )}
      </section>
    </div>
  )
}
