import { useState } from 'react'
import { Switch } from '@/components/motion/Switch'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { OptionPickerSheet, useFilterSheet } from '@/components/ui/FilterPicker'
import { ScrollRegion } from '@/components/ui/ScrollRegion'
import { useI18n } from '@/lib/i18n'
import { playInteractionSound } from '@/lib/motion'
import { selectPickerOptionClass } from '@/lib/selectSurface'
import {
  CUSTOM_SEASON_ID,
  type PeriodMode,
  formatYmdDisplay,
  mapPresetAcrossOpSubdivide,
  periodLabelKey,
  resolvePeriodRange,
  seasonPresetsForOpMode,
  yearOptions,
} from '@/lib/seasons'
import { uiLabel, uiPillFilter, uiPillFilterActive } from '@/lib/uiSurface'

const inputClassName =
  'mt-1 min-h-10 w-full rounded-xl border border-surface-muted bg-surface px-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand-500/30'

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
  const filterSheet = useFilterSheet()
  const [seasonSheetOpen, setSeasonSheetOpen] = useState(false)

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

  const seasonPresets = seasonPresetsForOpMode(opSubdivide)
  const seasonChipLabel =
    mode === 'op' && seasonPresetId !== CUSTOM_SEASON_ID
      ? t(periodLabelKey('op', seasonPresetId))
      : t('stats.periodMode.op')

  const yearOptionsList = yearOptions().map((year) => ({
    value: String(year),
    label: String(year),
  }))

  const openSeasonSheet = () => {
    playInteractionSound('tap')
    onModeChange('op')
    setSeasonSheetOpen(true)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={mode === 'op' ? uiPillFilterActive : uiPillFilter}
          onClick={openSeasonSheet}
        >
          {seasonChipLabel}
        </button>
        <button
          type="button"
          className={mode === 'year' ? uiPillFilterActive : uiPillFilter}
          onClick={() => {
            playInteractionSound('tap')
            if (mode !== 'quarter') onModeChange('year')
            filterSheet.open('year')
          }}
        >
          {String(selectedYear)}
        </button>
        {([1, 2, 3, 4] as const).map((quarter) => (
          <button
            key={quarter}
            type="button"
            className={mode === 'quarter' && selectedQuarter === quarter ? uiPillFilterActive : uiPillFilter}
            onClick={() => {
              playInteractionSound('toggle')
              onModeChange('quarter')
              onQuarterChange(quarter)
            }}
          >
            {t(`stats.period.quarter.q${quarter}` as 'stats.period.quarter.q1')}
          </button>
        ))}
      </div>

      <p className="text-xs text-text-secondary">{rangeLabel}</p>

      <BottomSheet
        open={seasonSheetOpen}
        title={t('stats.period.seasonLabel')}
        onClose={() => setSeasonSheetOpen(false)}
        manageScroll
      >
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-surface-muted bg-surface px-3 py-2.5">
            <span className="text-sm text-text-primary">{t('stats.period.opSubdivide')}</span>
            <Switch
              checked={opSubdivide}
              onChange={(next) => {
                onOpSubdivideChange(next)
                onSeasonPresetChange(mapPresetAcrossOpSubdivide(seasonPresetId, next))
              }}
              label={t('stats.period.opSubdivide')}
            />
          </label>
          <ScrollRegion axis="y" className="max-h-[min(50dvh,16rem)] space-y-1 pr-1">
            {seasonPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={selectPickerOptionClass(seasonPresetId === preset.id)}
                onClick={() => {
                  onSeasonPresetChange(preset.id)
                  setSeasonSheetOpen(false)
                }}
              >
                {t(periodLabelKey('op', preset.id))}
              </button>
            ))}
            <button
              type="button"
              className={selectPickerOptionClass(seasonPresetId === CUSTOM_SEASON_ID)}
              onClick={() => onSeasonPresetChange(CUSTOM_SEASON_ID)}
            >
              {t('stats.period.custom')}
            </button>
          </ScrollRegion>
          {seasonPresetId === CUSTOM_SEASON_ID ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className={uiLabel}>{t('stats.seasonFrom')}</span>
                <input
                  type="date"
                  className={inputClassName}
                  value={customFrom}
                  onChange={(event) => onCustomFromChange(event.target.value)}
                />
              </label>
              <label className="block">
                <span className={uiLabel}>{t('stats.seasonTo')}</span>
                <input
                  type="date"
                  className={inputClassName}
                  value={customTo}
                  onChange={(event) => onCustomToChange(event.target.value)}
                />
              </label>
            </div>
          ) : null}
        </div>
      </BottomSheet>

      <OptionPickerSheet
        open={filterSheet.isOpen('year')}
        title={t('stats.period.yearLabel')}
        value={String(selectedYear)}
        options={yearOptionsList}
        allLabel={t('stats.periodMode.year')}
        showAllOption={false}
        onChange={(value) => {
          onYearChange(Number(value))
          if (mode !== 'quarter') onModeChange('year')
        }}
        onClose={filterSheet.close}
      />
    </div>
  )
}
