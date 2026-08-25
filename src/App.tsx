import { useEffect } from 'react'
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
import { runPeriodicBackupIfNeeded } from '@/lib/autoBackup'
import { runGroupForegroundSync } from '@/lib/groupAutoSync'
import { flushPersistNow } from '@/lib/persistScheduler'
import { TabPager } from '@/components/motion/TabPager'
import { useHotkeys } from '@/components/motion/useHotkeys'
import { playInteractionSound } from '@/lib/motion'
import { applyAppearanceSettings } from '@/lib/theme'
import { languageLabels, useI18n } from '@/lib/i18n'
import { getAppState, useAppStore } from '@/stores/appStore'
import type { Language, TabId } from '@/types'

const TAB_ORDER: TabId[] = ['record', 'stats', 'history', 'settings']

function PageContent({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}) {
  const { t } = useI18n()
  const groupCode = useAppStore((state) => state.settings.lastGroupCode)

  return (
    <TabPager
      tabs={TAB_ORDER}
      active={activeTab}
      onChange={onTabChange}
      onRefresh={groupCode ? () => runGroupForegroundSync(groupCode, 'manual') : undefined}
      refreshIdleLabel={t('motion.pullRefresh')}
      refreshBusyLabel={t('motion.pullRefreshing')}
      render={(tab) => {
        switch (tab) {
          case 'record':
            return <RecordPage />
          case 'stats':
            return <StatsPage />
          case 'history':
            return <HistoryPage />
          case 'settings':
            return <SettingsPage />
          default:
            return null
        }
      }}
    />
  )
}

function OnboardingScreen() {
  const { t, language, setLanguage } = useI18n()
  const completeOnboarding = useAppStore((s) => s.completeOnboarding)

  return (
    <div className="flex h-full items-center justify-center bg-surface px-5 py-8">
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
      playInteractionSound('success')
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
  const density = useAppStore((state) => state.settings.density)

  useEffect(() => applyAppearanceSettings(theme, accent, density), [theme, accent, density])

  return null
}

function PeriodicBackupBridge() {
  const hydrated = useAppStore((state) => state.hydrated)
  const cloudUserId = useAppStore((state) => state.settings.cloudUserId)
  const replaceState = useAppStore((state) => state.replaceState)

  useEffect(() => {
    if (!hydrated || !cloudUserId) return

    const run = async () => {
      const state = getAppState()
      const label = state.settings.deviceLabel?.trim() || 'PWA'
      const next = await runPeriodicBackupIfNeeded(state, label)
      if (next !== state) replaceState(next)
    }

    void run()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void run()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [cloudUserId, hydrated, replaceState])

  return null
}

export default function App() {
  const { t } = useI18n()
  const hydrated = useAppStore((s) => s.hydrated)
  const activeTab = useAppStore((s) => s.activeTab)
  const onboardingCompleted = useAppStore((s) => s.settings.onboardingCompleted)
  const hydrate = useAppStore((s) => s.hydrate)
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  useHotkeys([
    { key: '1', handler: () => setActiveTab('record') },
    { key: '2', handler: () => setActiveTab('stats') },
    { key: '3', handler: () => setActiveTab('history') },
    { key: '4', handler: () => setActiveTab('settings') },
  ])

  useGroupCollab()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    const flush = () => flushPersistNow()
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('beforeunload', flush)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center bg-surface text-text-secondary">
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

  return (
    <ToastProvider>
      <ThemeBridge />
      <PeriodicBackupBridge />
      <AchievementToastBridge />
      <GlobalSessionRosterPrompt />
      <SessionDayPrompt />
      <AppShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        <PageContent activeTab={activeTab} onTabChange={setActiveTab} />
      </AppShell>
    </ToastProvider>
  )
}
