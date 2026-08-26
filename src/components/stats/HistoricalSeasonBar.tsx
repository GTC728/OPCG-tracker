import { useState } from 'react'
import { Switch } from '@/components/motion/Switch'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { OptionPickerSheet, useFilterSheet } from '@/components/ui/FilterPicker'
import { ScrollRegion } from '@/components/ui/ScrollRegion'
import { useI18n } from '@/lib/i18n'
import { playInteractionSound } from '@/lib/motion'
import { selectPickerOptionClass } from '@/lib/selectSurface'
import {
  type PeriodMode,
  formatYmdDisplay,
  latestOpSeasonId,
  mapPresetAcrossOpSubdivide,
  periodLabelKey,
  quarterChipLabelKey,
  quarterPickerLabelKey,
  resolvePeriodRange,
  seasonPresetsForOpMode,
  yearOptions,
} from '@/lib/seasons'
import type { StatsPeriodQuarter } from '@/types'
import { uiPillFilter, uiPillFilterActive } from '@/lib/uiSurface'

export function HistoricalSeasonBar({
  mode,
  seasonPresetId,
  opSubdivide,
  selectedYear,
  selectedQuarter,
  onModeChange,
  onSeasonPresetChange,
  onOpSubdivideChange,
  onYearChange,
  onQuarterChange,
  rangeLabel,
}: {
  mode: PeriodMode
  seasonPresetId: string
  opSubdivide: boolean
  selectedYear: number | null
  selectedQuarter: StatsPeriodQuarter | null
  onModeChange: (mode: PeriodMode) => void
  onSeasonPresetChange: (id: string) => void
  onOpSubdivideChange: (value: boolean) => void
  onYearChange: (year: number) => void
  onQuarterChange: (quarter: StatsPeriodQuarter) => void
  rangeLabel: string
}) {
  const { t } = useI18n()
  const filterSheet = useFilterSheet()
  const [seasonSheetOpen, setSeasonSheetOpen] = useState(false)

  const seasonPresets = seasonPresetsForOpMode(opSubdivide)
  const activeSeasonId = seasonPresetId || latestOpSeasonId()
  const seasonChipLabel =
    mode === 'op' ? t(periodLabelKey('op', activeSeasonId)) : t('stats.periodMode.op')

  const yearChipLabel = selectedYear != null ? String(selectedYear) : t('stats.period.yearLabel')
  const quarterChipLabel =
    selectedQuarter != null
      ? t(quarterChipLabelKey(selectedQuarter))
      : t('stats.period.quarterLabel')

  const yearOptionsList = yearOptions().map((year) => ({
    value: String(year),
    label: String(year),
  }))
  const quarterOptionsList = ([1, 2, 3, 4] as const).map((quarter) => ({
    value: String(quarter),
    label: t(quarterPickerLabelKey(quarter)),
  }))

  const openSeasonSheet = () => {
    playInteractionSound('tap')
    onModeChange('op')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={mode === 'op' ? uiPillFilterActive : uiPillFilter}
          onClick={() => {
            openSeasonSheet()
            setSeasonSheetOpen(true)
          }}
        >
          {seasonChipLabel}
        </button>
        <button
          type="button"
          className={mode === 'year' ? uiPillFilterActive : uiPillFilter}
          onClick={() => {
            playInteractionSound('tap')
            onModeChange('year')
            filterSheet.open('year')
          }}
        >
          {yearChipLabel}
        </button>
        <button
          type="button"
          className={mode === 'quarter' ? uiPillFilterActive : uiPillFilter}
          onClick={() => {
            playInteractionSound('tap')
            onModeChange('quarter')
            filterSheet.open('quarter')
          }}
        >
          {quarterChipLabel}
        </button>
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
                onSeasonPresetChange(mapPresetAcrossOpSubdivide(activeSeasonId, next))
              }}
              label={t('stats.period.opSubdivide')}
            />
          </label>
          <ScrollRegion axis="y" className="max-h-[min(50dvh,16rem)] space-y-1 pr-1">
            {seasonPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={selectPickerOptionClass(activeSeasonId === preset.id)}
                onClick={() => {
                  onSeasonPresetChange(preset.id)
                  setSeasonSheetOpen(false)
                }}
              >
                {t(periodLabelKey('op', preset.id))}
              </button>
            ))}
          </ScrollRegion>
        </div>
      </BottomSheet>

      <OptionPickerSheet
        open={filterSheet.isOpen('year')}
        title={t('stats.period.yearLabel')}
        value={selectedYear != null ? String(selectedYear) : ''}
        options={yearOptionsList}
        allLabel={t('stats.period.yearLabel')}
        showAllOption={false}
        onChange={(value) => {
          onYearChange(Number(value))
          onModeChange('year')
        }}
        onClose={filterSheet.close}
      />

      <OptionPickerSheet
        open={filterSheet.isOpen('quarter')}
        title={t('stats.period.quarterLabel')}
        value={selectedQuarter != null ? String(selectedQuarter) : ''}
        options={quarterOptionsList}
        allLabel={t('stats.period.quarterLabel')}
        showAllOption={false}
        onChange={(value) => {
          onQuarterChange(Number(value) as StatsPeriodQuarter)
          onModeChange('quarter')
        }}
        onClose={filterSheet.close}
      />
    </div>
  )
}

export function buildHistoricalSeasonRangeLabel(
  mode: PeriodMode,
  presetId: string,
  opSubdivide: boolean,
  selectedYear: number | null,
  selectedQuarter: StatsPeriodQuarter | null,
  customFrom: string,
  customTo: string,
  t: (key: import('@/lib/i18n').TranslationKey) => string,
): string {
  const filter = (() => {
    if (mode === 'year' && selectedYear == null) return { mode: 'op' as const, presetId }
    if (mode === 'quarter' && (selectedYear == null || selectedQuarter == null)) {
      return { mode: 'op' as const, presetId }
    }
    if (mode === 'year' && selectedYear != null) {
      return { mode: 'year' as const, presetId: String(selectedYear) }
    }
    if (mode === 'quarter' && selectedYear != null && selectedQuarter != null) {
      return { mode: 'quarter' as const, presetId: `${selectedYear}-q${selectedQuarter}` }
    }
    return { mode: 'op' as const, presetId }
  })()

  const range = resolvePeriodRange(filter.mode, filter.presetId, customFrom, customTo, { opSubdivide })
  return range.to
    ? `${formatYmdDisplay(range.from)} – ${formatYmdDisplay(range.to)}`
    : t('stats.seasonOpen').replace('{from}', formatYmdDisplay(range.from))
}
