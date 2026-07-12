import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { formatAuditTime } from '@/lib/auditLog'
import {
  buildOperationHistory,
  summarizeRevisionDiff,
  type OperationHistoryItem,
} from '@/lib/operationHistory'
import { useI18n } from '@/lib/i18n'
import { formatEntityDiffCodes } from '@/lib/entityDiffI18n'
import { uiCard } from '@/lib/uiSurface'
import type { AuditKind } from '@/types'
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

function HistoryRow({
  item,
  onUndo,
}: {
  item: OperationHistoryItem
  onUndo: (matchId: string) => void
}) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const kindKey = AUDIT_KIND_I18N[item.kind]

  return (
    <li className="border-b border-[var(--ui-border)] py-2.5 last:border-0">
      <div className="flex items-start gap-2">
        <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
          {t(kindKey)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-text-primary">{item.message}</p>
          <p className="mt-0.5 text-[10px] text-text-secondary">
            {formatAuditTime(item.at)}
            {item.actorLabel ? ` · ${item.actorLabel}` : ''}
          </p>
          {item.revision ? (
            <button
              type="button"
              className="mt-1 text-[10px] font-semibold text-brand-400"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? t('audit.hideRevision') : t('audit.showRevision')}
            </button>
          ) : null}
          {expanded && item.revision ? (
            <ul className="mt-1 list-inside list-disc text-[10px] text-text-secondary">
              {summarizeRevisionDiff(item.revision).map((code) => (
                <li key={code}>{formatEntityDiffCodes([code], t)[0]}</li>
              ))}
            </ul>
          ) : null}
        </div>
        {item.canUndo && item.match ? (
          <Button
            variant="secondary"
            className="hidden min-h-8 shrink-0 px-2 py-1 text-[10px] md:inline-flex"
            onClick={() => onUndo(item.match!.id)}
          >
            {t('audit.undo')}
          </Button>
        ) : null}
      </div>
      {item.canUndo && item.match ? (
        <Button
          variant="secondary"
          fullWidth
          className="mt-2 min-h-8 text-[10px] md:hidden"
          onClick={() => onUndo(item.match!.id)}
        >
          {t('audit.undo')}
        </Button>
      ) : null}
    </li>
  )
}

export function OperationHistoryPanel() {
  const { t } = useI18n()
  const auditLog = useAppStore((state) => state.auditLog)
  const matchRevisions = useAppStore((state) => state.matchRevisions)
  const matches = useAppStore((state) => state.matches)
  const activeMatches = useAppStore((state) => state.activeMatches)
  const undoCompletedMatch = useAppStore((state) => state.undoCompletedMatch)

  const history = useMemo(
    () => buildOperationHistory({ auditLog, matchRevisions, matches, activeMatches }),
    [auditLog, matchRevisions, matches, activeMatches],
  )

  return (
    <section className={[uiCard, 'hidden p-3 md:block'].join(' ')}>
      <h3 className="text-sm font-semibold">{t('audit.historyTitle')}</h3>
      <p className="mt-1 text-[11px] text-text-secondary">{t('audit.historyDesc')}</p>
      {history.length ? (
        <ol className="mt-2 max-h-80 overflow-y-auto">
          {history.map((item) => (
            <HistoryRow key={item.id} item={item} onUndo={undoCompletedMatch} />
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-xs text-text-secondary">{t('systemStatus.auditEmpty')}</p>
      )}
    </section>
  )
}
