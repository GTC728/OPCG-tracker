import { Button } from '@/components/ui/Button'
import { useI18n } from '@/lib/i18n'
import { uiCard } from '@/lib/uiSurface'
import type { SyncConflict, SyncConflictEntityKind } from '@/types'
import { useAppStore } from '@/stores/appStore'

const KIND_I18N: Record<SyncConflictEntityKind, import('@/lib/i18n').TranslationKey> = {
  match: 'conflict.kind.match',
  active_match: 'conflict.kind.activeMatch',
  player: 'conflict.kind.player',
  session: 'conflict.kind.session',
}

function ConflictRow({ conflict }: { conflict: SyncConflict }) {
  const { t } = useI18n()
  const resolveSyncConflict = useAppStore((state) => state.resolveSyncConflict)

  return (
    <li className="border-b border-[var(--ui-border)] py-3 last:border-0">
      <div className="flex items-start gap-2">
        <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
          {t(KIND_I18N[conflict.entityKind])}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text-primary">
            {conflict.localLabel} ↔ {conflict.remoteLabel}
          </p>
          <p className="mt-0.5 text-[10px] text-text-secondary">
            {conflict.source === 'join' ? t('conflict.sourceJoin') : t('conflict.sourcePull')}
            {conflict.remoteUpdatedBy ? ` · ${conflict.remoteUpdatedBy.slice(0, 8)}` : ''}
          </p>
          <ul className="mt-1 list-inside list-disc text-[10px] text-text-secondary">
            {conflict.diffLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <Button
          variant="secondary"
          className="min-h-8 flex-1 text-[10px]"
          onClick={() => resolveSyncConflict(conflict.id, 'local')}
        >
          {t('conflict.keepLocal')}
        </Button>
        <Button
          variant="primary"
          className="min-h-8 flex-1 text-[10px]"
          onClick={() => resolveSyncConflict(conflict.id, 'remote')}
        >
          {t('conflict.keepRemote')}
        </Button>
      </div>
    </li>
  )
}

export function GroupConflictPanel() {
  const { t } = useI18n()
  const conflicts = useAppStore((state) => state.syncConflicts ?? [])

  if (!conflicts.length) return null

  return (
    <section className={[uiCard, 'border border-warning/30 p-3'].join(' ')}>
      <h3 className="text-sm font-semibold text-warning">{t('conflict.title')}</h3>
      <p className="mt-1 text-[11px] text-text-secondary">{t('conflict.desc')}</p>
      <ol className="mt-2 max-h-96 overflow-y-auto">
        {conflicts.map((conflict) => (
          <ConflictRow key={conflict.id} conflict={conflict} />
        ))}
      </ol>
    </section>
  )
}
