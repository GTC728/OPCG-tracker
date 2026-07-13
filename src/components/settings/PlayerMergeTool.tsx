import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { FilterPickerRow, OptionPickerSheet, useFilterSheet } from '@/components/ui/FilterPicker'
import { IconButton } from '@/components/ui/IconButton'
import { IconMerge } from '@/components/ui/LobbyIcons'
import { useToast } from '@/components/ui/Toast'
import {
  countVisibleMatchesForPlayer,
  getMergeEligiblePlayers,
} from '@/lib/entityVisibility'
import { useI18n } from '@/lib/i18n'
import { useAppStore } from '@/stores/appStore'

export function PlayerMergeTool({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()
  const players = useAppStore((state) => state.players)
  const matches = useAppStore((state) => state.matches)
  const activeMatches = useAppStore((state) => state.activeMatches)
  const mergePlayers = useAppStore((state) => state.mergePlayers)
  const toast = useToast()
  const sheet = useFilterSheet()
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')

  const matchState = useMemo(() => ({ matches, activeMatches }), [activeMatches, matches])
  const eligiblePlayers = useMemo(
    () => getMergeEligiblePlayers({ players, matches, activeMatches }),
    [activeMatches, matches, players],
  )

  const playerOptions = useMemo(
    () =>
      eligiblePlayers.map((player) => {
        const matchCount = countVisibleMatchesForPlayer(matchState, player.id)
        return {
          value: player.id,
          label: `${player.name} · ${matchCount}`,
        }
      }),
    [eligiblePlayers, matchState],
  )

  const sourcePlayer = eligiblePlayers.find((player) => player.id === sourceId)
  const targetPlayer = eligiblePlayers.find((player) => player.id === targetId)

  const handleMerge = () => {
    if (!sourceId || !targetId || sourceId === targetId || !sourcePlayer || !targetPlayer) return
    const confirmed = window.confirm(
      t('data.mergeConfirm')
        .replace('{source}', sourcePlayer.name)
        .replace('{target}', targetPlayer.name),
    )
    if (!confirmed) return
    try {
      mergePlayers(sourceId, targetId)
      toast.success(t('data.mergeDone'))
      setSourceId('')
      setTargetId('')
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('data.mergeFailed'))
    }
  }

  const pickerSheets = (
    <>
      <OptionPickerSheet
        open={sheet.isOpen('source')}
        title={t('data.mergeSource')}
        options={playerOptions.filter((option) => option.value !== targetId)}
        value={sourceId}
        allLabel={t('data.mergePick')}
        onChange={setSourceId}
        onClose={sheet.close}
      />
      <OptionPickerSheet
        open={sheet.isOpen('target')}
        title={t('data.mergeTarget')}
        options={playerOptions.filter((option) => option.value !== sourceId)}
        value={targetId}
        allLabel={t('data.mergePick')}
        onChange={setTargetId}
        onClose={sheet.close}
      />
    </>
  )

  const form = eligiblePlayers.length < 2 ? (
    <p className="rounded-xl border border-dashed border-surface-muted px-3 py-4 text-center text-sm text-text-secondary">
      {t('data.mergeNeedTwo')}
    </p>
  ) : (
    <>
      <FilterPickerRow
        label={t('data.mergeSource')}
        value={sourcePlayer ? sourcePlayer.name : ''}
        placeholder={t('data.mergePick')}
        onClick={() => sheet.open('source')}
      />
      {!compact ? (
        <div className="flex justify-center py-0.5 text-xs text-text-secondary" aria-hidden>
          ↓
        </div>
      ) : null}
      <FilterPickerRow
        label={t('data.mergeTarget')}
        value={targetPlayer ? targetPlayer.name : ''}
        placeholder={t('data.mergePick')}
        onClick={() => sheet.open('target')}
      />
      <Button
        className={compact ? '' : 'mt-4'}
        fullWidth
        disabled={!sourceId || !targetId || sourceId === targetId}
        onClick={handleMerge}
      >
        <span className="inline-flex items-center justify-center gap-2">
          <IconMerge />
          {t('data.mergeAction')}
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
      <div className="flex items-start gap-3">
        <IconButton label={t('data.mergePlayers')} variant="brand" className="pointer-events-none">
          <IconMerge />
        </IconButton>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{t('data.mergePlayers')}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t('data.mergePlayersDesc')}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {form}
      </div>
      {pickerSheets}
    </section>
  )
}
