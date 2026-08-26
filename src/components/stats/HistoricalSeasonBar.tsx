import { Switch } from '@/components/motion/Switch'
import { HorizontalRail } from '@/components/ui/HorizontalRail'
import { useI18n } from '@/lib/i18n'
import { playInteractionSound } from '@/lib/motion'
import {
  CUSTOM_SEASON_ID,
  SPLIT_SEASON_PRESETS,
  type PeriodMode,
  formatYmdDisplay,
  periodLabelKey,
  resolvePeriodRange,
  seasonPresetsForOpMode,
  yearOptions,
} from '@/lib/seasons'
import { uiLabel, uiPillFilter, uiPillFilterActive } from '@/lib/uiSurface'

const PERIOD_MODES: PeriodMode[] = ['half', 'op', 'quarter', 'year']

const selectClassName =
  'min-h-10 w-full rounded-xl border border-surface-muted bg-surface px-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand-500/30'

export function HistoricalSeasonBar({
  mode,
  seasonPresetId,
  opSubdivide,
  selectedYear,
  selectedQuarter,
  customFrom,
  customTo,
  onModeChange,
  onSeasonPresetChange,
  onOpSubdivideChange,
  onYearChange,
  onQuarterChange,
  onCustomFromChange,
  onCustomToChange,
}: {
  mode: PeriodMode
  seasonPresetId: string
  opSubdivide: boolean
  selectedYear: number
  selectedQuarter: 1 | 2 | 3 | 4
  customFrom: string
  customTo: string
  onModeChange: (mode: PeriodMode) => void
  onSeasonPresetChange: (id: string) => void
  onOpSubdivideChange: (value: boolean) => void
  onYearChange: (year: number) => void
  onQuarterChange: (quarter: 1 | 2 | 3 | 4) => void
  onCustomFromChange: (value: string) => void
  onCustomToChange: (value: string) => void
}) {
  const { t } = useI18n()
  const effectivePresetId =
    mode === 'year'
      ? String(selectedYear)
      : mode === 'quarter'
        ? `${selectedYear}-q${selectedQuarter}`
        : seasonPresetId
  const range = resolvePeriodRange(mode, effectivePresetId, customFrom, customTo, { opSubdivide })
  const rangeLabel = range.to
    ? `${formatYmdDisplay(range.from)} – ${formatYmdDisplay(range.to)}`
    : t('stats.seasonOpen').replace('{from}', formatYmdDisplay(range.from))

  const seasonPresets = mode === 'half' ? SPLIT_SEASON_PRESETS : seasonPresetsForOpMode(opSubdivide)

  return (
    <div className="space-y-3">
      <HorizontalRail>
        {PERIOD_MODES.map((periodMode) => {
          const active = mode === periodMode
          return (
            <button
              key={periodMode}
              type="button"
              className={[active ? uiPillFilterActive : uiPillFilter, 'shrink-0'].join(' ')}
              onClick={() => {
                playInteractionSound('tap')
                onModeChange(periodMode)
              }}
            >
              {t(`stats.periodMode.${periodMode}` as 'stats.periodMode.half')}
            </button>
          )
        })}
      </HorizontalRail>

      {mode === 'op' ? (
        <div className="space-y-3">
          <label className="block">
            <span className={uiLabel}>{t('stats.period.seasonLabel')}</span>
            <select
              className={`${selectClassName} mt-1`}
              value={seasonPresetId}
              onChange={(event) => onSeasonPresetChange(event.target.value)}
            >
              {seasonPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {t(periodLabelKey('op', preset.id))}
                </option>
              ))}
              <option value={CUSTOM_SEASON_ID}>{t('stats.period.custom')}</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-surface-muted bg-surface px-3 py-2.5">
            <span className="text-sm text-text-primary">{t('stats.period.opSubdivide')}</span>
            <Switch checked={opSubdivide} onChange={onOpSubdivideChange} label={t('stats.period.opSubdivide')} />
          </label>
        </div>
      ) : null}

      {mode === 'half' ? (
        <label className="block">
          <span className={uiLabel}>{t('stats.period.halfLabel')}</span>
          <select
            className={`${selectClassName} mt-1`}
            value={seasonPresetId}
            onChange={(event) => onSeasonPresetChange(event.target.value)}
          >
            {SPLIT_SEASON_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {t(periodLabelKey('half', preset.id))}
              </option>
            ))}
            <option value={CUSTOM_SEASON_ID}>{t('stats.period.custom')}</option>
          </select>
        </label>
      ) : null}

      {mode === 'quarter' ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={uiLabel}>{t('stats.period.yearLabel')}</span>
            <select
              className={`${selectClassName} mt-1`}
              value={selectedYear}
              onChange={(event) => onYearChange(Number(event.target.value))}
            >
              {yearOptions().map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={uiLabel}>{t('stats.period.quarterLabel')}</span>
            <select
              className={`${selectClassName} mt-1`}
              value={selectedQuarter}
              onChange={(event) => onQuarterChange(Number(event.target.value) as 1 | 2 | 3 | 4)}
            >
              {([1, 2, 3, 4] as const).map((quarter) => (
                <option key={quarter} value={quarter}>
                  {t(`stats.period.quarter.q${quarter}` as 'stats.period.quarter.q1')}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {mode === 'year' ? (
        <label className="block">
          <span className={uiLabel}>{t('stats.period.yearLabel')}</span>
          <select
            className={`${selectClassName} mt-1`}
            value={selectedYear}
            onChange={(event) => onYearChange(Number(event.target.value))}
          >
            {yearOptions().map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {(mode === 'op' || mode === 'half') && seasonPresetId === CUSTOM_SEASON_ID ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={uiLabel}>{t('stats.seasonFrom')}</span>
            <input
              type="date"
              className={`${selectClassName} mt-1`}
              value={customFrom}
              onChange={(event) => onCustomFromChange(event.target.value)}
            />
          </label>
          <label className="block">
            <span className={uiLabel}>{t('stats.seasonTo')}</span>
            <input
              type="date"
              className={`${selectClassName} mt-1`}
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
