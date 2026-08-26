import {
  CUSTOM_SEASON_ID,
  type PeriodMode,
  formatYmdDisplay,
  periodLabelKey,
  periodPresetButtonLabel,
  periodWindowById,
  presetsForMode,
  resolvePeriodRange,
} from '@/lib/seasons'
import { useI18n } from '@/lib/i18n'
import { uiLabel, uiPillFilter, uiPillFilterActive } from '@/lib/uiSurface'
import { playInteractionSound } from '@/lib/motion'

const PERIOD_MODES: PeriodMode[] = ['half', 'op', 'quarter', 'year']

export function PeriodRangeBar({
  mode,
  presetId,
  customFrom,
  customTo,
  onModeChange,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
}: {
  mode: PeriodMode
  presetId: string
  customFrom: string
  customTo: string
  onModeChange: (mode: PeriodMode) => void
  onPresetChange: (id: string) => void
  onCustomFromChange: (value: string) => void
  onCustomToChange: (value: string) => void
}) {
  const { t } = useI18n()
  const presets = presetsForMode(mode)
  const range = resolvePeriodRange(mode, presetId, customFrom, customTo)
  const rangeLabel = range.to
    ? `${formatYmdDisplay(range.from)} – ${formatYmdDisplay(range.to)}`
    : t('stats.seasonOpen').replace('{from}', formatYmdDisplay(range.from))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PERIOD_MODES.map((periodMode) => {
          const active = mode === periodMode
          return (
            <button
              key={periodMode}
              type="button"
              className={active ? uiPillFilterActive : uiPillFilter}
              onClick={() => {
                playInteractionSound('tap')
                onModeChange(periodMode)
              }}
            >
              {t(`stats.periodMode.${periodMode}` as 'stats.periodMode.half')}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => {
          const window = periodWindowById(mode, preset.id)
          const active = presetId === preset.id
          const label =
            mode === 'year' || mode === 'quarter'
              ? periodPresetButtonLabel(mode, preset.id)
              : t(periodLabelKey(mode, preset.id))
          return (
            <button
              key={preset.id}
              type="button"
              className={active ? uiPillFilterActive : uiPillFilter}
              onClick={() => {
                playInteractionSound('tap')
                onPresetChange(preset.id)
              }}
            >
              {label}
              {window && mode !== 'quarter' && mode !== 'year' ? (
                <span className="ml-1 opacity-70">{formatYmdDisplay(window.from)}</span>
              ) : null}
            </button>
          )
        })}
        <button
          type="button"
          className={presetId === CUSTOM_SEASON_ID ? uiPillFilterActive : uiPillFilter}
          onClick={() => {
            playInteractionSound('tap')
            const current = periodWindowById(mode, presetId)
            if (!customFrom && current) onCustomFromChange(current.from)
            if (!customTo && current?.to) onCustomToChange(current.to)
            onPresetChange(CUSTOM_SEASON_ID)
          }}
        >
          {t('stats.period.custom')}
        </button>
      </div>

      {presetId === CUSTOM_SEASON_ID ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={uiLabel}>{t('stats.seasonFrom')}</span>
            <input
              type="date"
              className="mt-1 min-h-10 w-full rounded-xl border border-surface-muted bg-surface px-3 text-sm"
              value={customFrom}
              onChange={(event) => onCustomFromChange(event.target.value)}
            />
          </label>
          <label className="block">
            <span className={uiLabel}>{t('stats.seasonTo')}</span>
            <input
              type="date"
              className="mt-1 min-h-10 w-full rounded-xl border border-surface-muted bg-surface px-3 text-sm"
              value={customTo}
              onChange={(event) => onCustomToChange(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      <p className="text-xs text-text-secondary">{rangeLabel}</p>
    </div>
  )
}
