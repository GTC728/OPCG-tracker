import { useEffect, useRef } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { SessionDayPrompt } from '@/components/session/SessionDayPrompt'
import { SessionRosterSheet } from '@/components/session/SessionRosterSheet'
import { useGroupCollab } from '@/hooks/useGroupCollab'
import { HistoryPage } from '@/pages/HistoryPage'
import { RecordPage } from '@/pages/RecordPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { StatsPage } from '@/pages/StatsPage'
import { Button } from '@/components/ui/Button'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { formatAchievementToast } from '@/lib/achievements'
import { applyThemeSettings } from '@/lib/theme'
import { languageLabels, useI18n } from '@/lib/i18n'
import { useAppStore } from '@/stores/appStore'
import type { Language, TabId } from '@/types'

function PageContent({ activeTab }: { activeTab: TabId }) {
  return (
    <>
      <div className={activeTab === 'record' ? undefined : 'hidden'} aria-hidden={activeTab !== 'record'}>
        <RecordPage />
      </div>
      <div className={activeTab === 'stats' ? undefined : 'hidden'} aria-hidden={activeTab !== 'stats'}>
        <StatsPage />
      </div>
      <div className={activeTab === 'history' ? undefined : 'hidden'} aria-hidden={activeTab !== 'history'}>
        <HistoryPage />
      </div>
      <div className={activeTab === 'settings' ? undefined : 'hidden'} aria-hidden={activeTab !== 'settings'}>
        <SettingsPage />
      </div>
    </>
  )
}

function OnboardingScreen() {
  const { t, language, setLanguage } = useI18n()
  const completeOnboarding = useAppStore((s) => s.completeOnboarding)

  return (
    <div className="flex min-h-full items-center justify-center bg-surface px-5 py-8">
      <section className="w-full max-w-md rounded-3xl bg-surface-elevated p-6 shadow-2xl ring-1 ring-surface-muted">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">OPCG Tracker V4</p>
        <h1 className="mt-3 text-3xl font-bold">{t('onboarding.title')}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t('onboarding.subtitle')}</p>

        <label className="mt-5 block">
          <span className="text-sm font-medium text-text-secondary">{t('onboarding.languageLabel')}</span>
          <select
            className="mt-2 min-h-12 w-full rounded-xl border border-surface-muted bg-surface px-3 text-text-primary"
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
          >
            {languageLabels.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 rounded-2xl bg-brand-500/10 p-4 ring-1 ring-brand-500/30">
          <h2 className="font-semibold text-brand-100">{t('onboarding.cloudTitle')}</h2>
          <p className="mt-2 text-sm text-text-secondary">{t('onboarding.cloudDesc')}</p>
        </div>

        <Button className="mt-5" fullWidth onClick={completeOnboarding}>
          {t('onboarding.start')}
        </Button>
      </section>
    </div>
  )
}

function GlobalSessionRosterPrompt() {
  const rosterPromptSessionId = useAppStore((s) => s.settings.rosterPromptSessionId)
  const dismissSessionRosterPrompt = useAppStore((s) => s.dismissSessionRosterPrompt)

  if (!rosterPromptSessionId) return null

  return (
    <SessionRosterSheet
      sessionId={rosterPromptSessionId}
      open
      onClose={dismissSessionRosterPrompt}
    />
  )
}

function AchievementToastBridge() {
  const { language, t } = useI18n()
  const { showToast } = useToast()
  const pending = useAppStore((state) => state.pendingAchievementToasts)
  const clear = useAppStore((state) => state.clearPendingAchievementToasts)
  const enabled = useAppStore((state) => state.settings.achievementNotifications)

  useEffect(() => {
    if (!enabled || !pending.length) return
    for (const unlock of pending) {
      showToast({
        type: 'success',
        message: `${t('achievements.unlocked')}: ${formatAchievementToast(unlock.achievementId, unlock.level, language)}`,
        durationMs: 6500,
      })
    }
    clear()
  }, [clear, enabled, language, pending, showToast, t])

  return null
}

function ThemeBridge() {
  const theme = useAppStore((state) => state.settings.theme)
  const accent = useAppStore((state) => state.settings.accent)

  useEffect(() => applyThemeSettings(theme, accent), [theme, accent])
  return null
}

export default function App() {
  const { t } = useI18n()
  const hydrated = useAppStore((s) => s.hydrated)
  const activeTab = useAppStore((s) => s.activeTab)
  const onboardingCompleted = useAppStore((s) => s.settings.onboardingCompleted)
  const hydrate = useAppStore((s) => s.hydrate)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const scrollPositions = useRef<Partial<Record<TabId, number>>>({})

  const handleTabChange = (tab: TabId) => {
    scrollPositions.current[activeTab] = window.scrollY
    setActiveTab(tab)
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositions.current[tab] ?? 0)
    })
  }

  useGroupCollab()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (!hydrated) {
    return (
      <div className="flex min-h-full items-center justify-center bg-surface text-text-secondary">
        {t('app.loading')}
      </div>
    )
  }

  if (!onboardingCompleted) {
    return (
      <ToastProvider>
        <OnboardingScreen />
      </ToastProvider>
    )
  }

  const pageMeta: Record<TabId, { title: string; subtitle?: string }> = {
    record: { title: t('page.record.title'), subtitle: t('page.record.subtitle') },
    stats: { title: t('page.stats.title'), subtitle: t('page.stats.subtitle') },
    history: { title: t('page.history.title'), subtitle: t('page.history.subtitle') },
    settings: { title: t('page.settings.title'), subtitle: t('page.settings.subtitle') },
  }
  const meta = pageMeta[activeTab]

  return (
    <ToastProvider>
      <ThemeBridge />
      <AchievementToastBridge />
      <GlobalSessionRosterPrompt />
      <SessionDayPrompt />
      <AppShell
        title={meta.title}
        subtitle={meta.subtitle}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
        <PageContent activeTab={activeTab} />
      </AppShell>
    </ToastProvider>
  )
}
