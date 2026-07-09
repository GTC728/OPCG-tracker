import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { listImportSnapshots } from '@/lib/importSnapshots'
import { validateHistoricalImportMatches, hasUsedHistoricalImport } from '@/lib/historicalImport'
import { useI18n } from '@/lib/i18n'
import { formatDateTime } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'

export function ImportHistoryPanel() {
  const { t } = useI18n()
  const toast = useToast()
  const importBatches = useAppStore((state) => state.importBatches)
  const revertImportBatch = useAppStore((state) => state.revertImportBatch)
  const promoteImportBatchToHistorical = useAppStore((state) => state.promoteImportBatchToHistorical)
  const importRows = useAppStore((state) => state.importRows)
  const matches = useAppStore((state) => state.matches)
  const historicalImportUsedAt = useAppStore((state) => state.settings.historicalImportUsedAt)
  const restoreImportSnapshot = useAppStore((state) => state.restoreImportSnapshot)
  const [busyId, setBusyId] = useState<string | null>(null)

  const snapshots = useMemo(() => listImportSnapshots(), [importBatches.length])

  const batches = useMemo(
    () =>
      [...importBatches].sort(
        (a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime(),
      ),
    [importBatches],
  )

  if (!batches.length && !snapshots.length) return null

  return (
    <section className="rounded-2xl bg-surface-elevated p-4">
      <h2 className="text-lg font-semibold">{t('data.importHistoryTitle')}</h2>
      <p className="mt-1 text-sm text-text-secondary">{t('data.importHistoryDesc')}</p>

      {batches.length ? (
        <ol className="mt-4 space-y-2">
          {batches.slice(0, 10).map((batch) => {
            const batchMatchIds = importRows
              .filter((row) => row.batchId === batch.id && row.status === 'imported' && row.matchId)
              .map((row) => row.matchId as string)
            const batchMatches = matches.filter(
              (match) => batchMatchIds.includes(match.id) && match.deletedAt === null,
            )
            const canPromote =
              !batch.revertedAt &&
              !batch.historicalRestore &&
              batch.successCount > 0 &&
              !hasUsedHistoricalImport(historicalImportUsedAt) &&
              validateHistoricalImportMatches(batchMatches).ok

            return (
            <li key={batch.id} className="rounded-xl bg-surface p-3 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary">{batch.filename}</p>
                  <p className="mt-1 text-text-secondary">
                    {formatDateTime(batch.importedAt)} · {batch.successCount} {t('data.importSuccessUnit')}
                    {batch.historicalRestore ? ' · 歷史還原' : ''}
                    {batch.revertedAt ? ` · ${t('data.importReverted')}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                {canPromote ? (
                  <Button
                    variant="secondary"
                    className="min-h-8 px-3 text-xs"
                    disabled={busyId === batch.id}
                    onClick={() => {
                      const ok = window.confirm(
                        `將 ${batch.successCount} 場升級為歷史還原？終身僅限一次，計入累積型成就。`,
                      )
                      if (!ok) return
                      setBusyId(batch.id)
                      try {
                        const count = promoteImportBatchToHistorical(batch.id)
                        toast.success(`已升級 ${count} 場為歷史還原，成就已重算`)
                      } catch (caught) {
                        toast.error(caught instanceof Error ? caught.message : t('delete.failed'))
                      } finally {
                        setBusyId(null)
                      }
                    }}
                  >
                    升級歷史還原
                  </Button>
                ) : null}
                {!batch.revertedAt && batch.successCount > 0 ? (
                  <Button
                    variant="danger"
                    className="min-h-8 px-3 text-xs"
                    disabled={busyId === batch.id}
                    onClick={() => {
                      const ok = window.confirm(t('data.revertImportConfirm').replace('{n}', String(batch.successCount)))
                      if (!ok) return
                      setBusyId(batch.id)
                      try {
                        const count = revertImportBatch(batch.id)
                        toast.success(t('data.revertImportDone').replace('{n}', String(count)))
                      } catch (caught) {
                        toast.error(caught instanceof Error ? caught.message : t('delete.failed'))
                      } finally {
                        setBusyId(null)
                      }
                    }}
                  >
                    {t('data.revertImport')}
                  </Button>
                ) : null}
                </div>
              </div>
            </li>
            )
          })}
        </ol>
      ) : null}

      {snapshots.length ? (
        <div className="mt-4 border-t border-surface-muted pt-4">
          <p className="text-sm font-semibold text-text-primary">{t('data.importSnapshotsTitle')}</p>
          <p className="mt-1 text-xs text-text-secondary">{t('data.importSnapshotsDesc')}</p>
          <ol className="mt-2 space-y-2">
            {snapshots.map((snap) => (
              <li key={snap.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface p-3 text-xs">
                <div>
                  <p className="font-medium text-text-primary">{snap.label}</p>
                  <p className="mt-0.5 text-text-secondary">
                    {formatDateTime(snap.createdAt)} · {snap.matchCount} 場 · {snap.playerCount} 人
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="min-h-8 shrink-0 px-3 text-xs"
                  disabled={busyId === snap.id}
                  onClick={() => {
                    const ok = window.confirm(t('data.restoreSnapshotConfirm'))
                    if (!ok) return
                    setBusyId(snap.id)
                    try {
                      restoreImportSnapshot(snap.id)
                      toast.success(t('data.restoreSnapshotDone'))
                    } catch (caught) {
                      toast.error(caught instanceof Error ? caught.message : t('delete.failed'))
                    } finally {
                      setBusyId(null)
                    }
                  }}
                >
                  {t('data.restoreSnapshot')}
                </Button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  )
}
