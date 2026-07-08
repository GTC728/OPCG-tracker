import { accentOptions, applyAppearanceSettings } from '@/lib/theme'
import { playInteractionSound, uiPressable } from '@/lib/motion'
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
    return applyAppearanceSettings(settings.theme, settings.accent, settings.density)
  }, [settings.theme, settings.accent, settings.density])

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
                uiPressable,
                'p-3 text-sm font-semibold',
                settings.theme === theme ? 'ring-brand-500/40' : '',
              ].join(' ')}
              onClick={() => {
                playInteractionSound('toggle')
                updateSettings({ theme })
              }}
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
                'flex h-12 flex-col items-center justify-center rounded-lg border border-[var(--ui-border)]',
                uiPressable,
                settings.accent === option.value ? 'ring-2 ring-brand-500/50' : '',
              ].join(' ')}
              onClick={() => {
                playInteractionSound('toggle')
                updateSettings({ accent: option.value as AccentPreset })
              }}
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
                uiPressable,
                'p-3 text-sm font-semibold',
                settings.density === density ? 'ring-brand-500/40' : '',
              ].join(' ')}
              onClick={() => {
                playInteractionSound('toggle')
                updateSettings({ density })
              }}
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
                uiPressable,
                'p-3 text-xs font-semibold',
                settings.statsDefaultScope === scope ? 'ring-brand-500/40' : '',
              ].join(' ')}
              onClick={() => {
                playInteractionSound('toggle')
                updateSettings({ statsDefaultScope: scope })
              }}
            >
              {t(`appearance.statsDefault.${scope}` as 'appearance.statsDefault.profile')}
            </button>
          ))}
        </div>
      </section>

      <label className="ui-card-inset flex items-center justify-between px-3 py-3">
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
