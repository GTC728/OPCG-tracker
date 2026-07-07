import { accentOptions, applyThemeSettings } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { uiCardInset, uiSectionTitle } from '@/lib/uiSurface'
import { useAppStore } from '@/stores/appStore'
import type { AccentPreset, StatsDefaultScope, ThemeMode, UiDensity } from '@/types'
import { useEffect } from 'react'

export function AppearanceSettings() {
  const { t } = useI18n()
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)

  useEffect(() => {
    return applyThemeSettings(settings.theme, settings.accent)
  }, [settings.theme, settings.accent])

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h2 className={uiSectionTitle}>{t('appearance.theme')}</h2>
        <div className="grid grid-cols-3 gap-2">
          {(['dark', 'light', 'system'] as ThemeMode[]).map((theme) => (
            <button
              key={theme}
              type="button"
              className={[
                uiCardInset,
                'p-3 text-sm font-semibold',
                settings.theme === theme ? 'ring-brand-500/40' : '',
              ].join(' ')}
              onClick={() => updateSettings({ theme })}
            >
              {t(`appearance.theme.${theme}` as 'appearance.theme.dark')}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className={uiSectionTitle}>{t('appearance.accent')}</h2>
        <div className="grid grid-cols-5 gap-2">
          {accentOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              title={t(option.labelKey as 'appearance.accentBlue')}
              className={[
                'flex h-12 flex-col items-center justify-center rounded-lg ring-1 ring-white/[0.08]',
                settings.accent === option.value ? 'ring-brand-500/50' : '',
              ].join(' ')}
              onClick={() => updateSettings({ accent: option.value as AccentPreset })}
            >
              <span className="size-5 rounded-full" style={{ background: option.swatch }} />
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className={uiSectionTitle}>{t('appearance.density')}</h2>
        <div className="grid grid-cols-2 gap-2">
          {(['compact', 'comfortable'] as UiDensity[]).map((density) => (
            <button
              key={density}
              type="button"
              className={[
                uiCardInset,
                'p-3 text-sm font-semibold',
                settings.density === density ? 'ring-brand-500/40' : '',
              ].join(' ')}
              onClick={() => updateSettings({ density })}
            >
              {t(`appearance.density.${density}` as 'appearance.density.compact')}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className={uiSectionTitle}>{t('appearance.statsDefault')}</h2>
        <div className="grid grid-cols-3 gap-2">
          {(['profile', 'session', 'all'] as StatsDefaultScope[]).map((scope) => (
            <button
              key={scope}
              type="button"
              className={[
                uiCardInset,
                'p-3 text-xs font-semibold',
                settings.statsDefaultScope === scope ? 'ring-brand-500/40' : '',
              ].join(' ')}
              onClick={() => updateSettings({ statsDefaultScope: scope })}
            >
              {t(`appearance.statsDefault.${scope}` as 'appearance.statsDefault.profile')}
            </button>
          ))}
        </div>
      </section>

      <label className="flex items-center justify-between rounded-lg bg-surface-elevated/70 px-3 py-3 ring-1 ring-white/[0.06]">
        <span className="text-sm">{t('appearance.achievementNotifications')}</span>
        <input
          type="checkbox"
          checked={settings.achievementNotifications}
          onChange={(event) => updateSettings({ achievementNotifications: event.target.checked })}
        />
      </label>
    </div>
  )
}
