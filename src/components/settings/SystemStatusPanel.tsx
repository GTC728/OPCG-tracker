import { GroupSyncSection } from '@/components/settings/GroupSyncSection'
import { OperationHistoryPanel } from '@/components/settings/OperationHistoryPanel'
import { formatAuditActor, formatAuditTime } from '@/lib/auditLog'
import { useI18n } from '@/lib/i18n'
import { uiCard } from '@/lib/uiSurface'
import type { AuditEntry, AuditKind } from '@/types'
import { useAppStore } from '@/stores/appStore'

const AUDIT_KIND_I18N: Record<AuditKind, import('@/lib/i18n').TranslationKey> = {
  match_complete: 'audit.kind.matchComplete',
  match_undo: 'audit.kind.matchUndo',
  match_edit: 'audit.kind.matchEdit',
  match_delete: 'audit.kind.matchDelete',
  import: 'audit.kind.import',
  import_revert: 'audit.kind.importRevert',
  sync: 'audit.kind.sync',
  session: 'audit.kind.session',
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const { t } = useI18n()
  return (
    <li className="flex items-start gap-2 border-b border-[var(--ui-border)] py-2 last:border-0">
      <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
        {t(AUDIT_KIND_I18N[entry.kind])}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs">{entry.message}</p>
        <p className="mt-0.5 text-[10px] text-text-secondary">
          {formatAuditTime(entry.at)}
          {entry.actor ? ` · ${formatAuditActor(entry.actor)}` : ''}
        </p>
      </div>
    </li>
  )
}

export function SystemStatusPanel() {
  const { t } = useI18n()
  const auditLog = useAppStore((state) => state.auditLog)

  return (
    <div className="space-y-3">
      <GroupSyncSection />

      <OperationHistoryPanel />

      <section className={[uiCard, 'p-3 md:hidden'].join(' ')}>
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
