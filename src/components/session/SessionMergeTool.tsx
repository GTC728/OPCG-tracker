import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { FilterPickerRow, OptionPickerSheet, useFilterSheet } from '@/components/ui/FilterPicker'
import { IconMerge } from '@/components/ui/LobbyIcons'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/lib/i18n'
import type { Session } from '@/types'

export function SessionMergeTool({
  sessions,
  compact = false,
  onMerge,
  onMerged,
}: {
  sessions: Session[]
  compact?: boolean
  onMerge: (sourceId: string, targetId: string) => void
  onMerged?: () => void
}) {
  const { t } = useI18n()
  const toast = useToast()
  const sheet = useFilterSheet()
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')

  const eligible = useMemo(
    () => sessions.filter((session) => session.deletedAt === null),
    [sessions],
  )

  const sessionOptions = useMemo(
    () =>
      eligible.map((session) => ({
        value: session.id,
        label: session.name,
      })),
    [eligible],
  )

  const sourceSession = eligible.find((session) => session.id === sourceId)
  const targetSession = eligible.find((session) => session.id === targetId)

  const handleMerge = () => {
    if (!sourceId || !targetId || sourceId === targetId || !sourceSession || !targetSession) return
    const confirmed = window.confirm(
      t('session.mergeConfirm')
        .replace('{source}', sourceSession.name)
        .replace('{target}', targetSession.name),
    )
    if (!confirmed) return
    try {
      onMerge(sourceId, targetId)
      toast.success(t('session.merged'))
      setSourceId('')
      setTargetId('')
      onMerged?.()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('session.mergeFailed'))
    }
  }

  const pickerSheets = (
    <>
      <OptionPickerSheet
        open={sheet.isOpen('source')}
        title={t('session.mergeSource')}
        options={sessionOptions.filter((option) => option.value !== targetId)}
        value={sourceId}
        allLabel={t('session.mergePick')}
        onChange={setSourceId}
        onClose={sheet.close}
      />
      <OptionPickerSheet
        open={sheet.isOpen('target')}
        title={t('session.mergeTarget')}
        options={sessionOptions.filter((option) => option.value !== sourceId)}
        value={targetId}
        allLabel={t('session.mergePick')}
        onChange={setTargetId}
        onClose={sheet.close}
      />
    </>
  )

  const form =
    eligible.length < 2 ? (
      <p className="rounded-xl border border-dashed border-surface-muted px-3 py-4 text-center text-sm text-text-secondary">
        {t('session.mergeNeedTwo')}
      </p>
    ) : (
      <>
        <FilterPickerRow
          label={t('session.mergeSource')}
          value={sourceSession?.name ?? ''}
          placeholder={t('session.mergePick')}
          onClick={() => sheet.open('source')}
        />
        {!compact ? (
          <div className="flex justify-center py-0.5 text-xs text-text-secondary" aria-hidden>
            ↓
          </div>
        ) : null}
        <FilterPickerRow
          label={t('session.mergeTarget')}
          value={targetSession?.name ?? ''}
          placeholder={t('session.mergePick')}
          onClick={() => sheet.open('target')}
        />
        <Button
          className={compact ? '' : 'mt-3'}
          fullWidth
          disabled={!sourceId || !targetId || sourceId === targetId}
          onClick={handleMerge}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <IconMerge />
            {t('session.mergeAction')}
          </span>
        </Button>
      </>
    )

  if (compact) {
    return (
      <div className="space-y-2">
        {form}
        {pickerSheets}
      </div>
    )
  }

  return (
    <section className="rounded-2xl bg-surface-elevated p-4 ring-1 ring-surface-muted">
      <h2 className="text-lg font-semibold">{t('session.mergeTitle')}</h2>
      <p className="mt-1 text-sm text-text-secondary">{t('session.mergeDesc')}</p>
      <div className="mt-4 space-y-2">
        {form}
      </div>
      {pickerSheets}
    </section>
  )
}
