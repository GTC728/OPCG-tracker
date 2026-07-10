import { type ReactNode, useState } from 'react'
import { AppBrandCredit } from '@/components/layout/AppCredit'
import { BottomChromeShell } from '@/components/layout/BottomChrome'
import { SyncStatusBanner } from '@/components/layout/SyncStatusBanner'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { WorkspaceHub } from '@/components/workspace/WorkspaceHub'
import { uiBottomNav, uiHeaderBar } from '@/lib/uiSurface'
import { playInteractionSound, uiPressable } from '@/lib/motion'
import { useI18n } from '@/lib/i18n'
import type { TabId } from '@/types'

function NavIcon({ name }: { name: TabId }) {
  const className = 'ui-nav-icon h-5 w-5'
  switch (name) {
    case 'record':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
          <path d="M13 19l6-6" />
          <path d="m16 16 4 4" />
          <path d="M19 9l-7 7-4-1 1-4 7-7Z" />
        </svg>
      )
    case 'stats':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 17V9" />
          <path d="M12 17V7" />
          <path d="M16 17v-5" />
        </svg>
      )
    case 'history':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 3v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    case 'settings':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      )
  }
}

const tabs: Array<{ id: TabId; labelKey: 'nav.record' | 'nav.stats' | 'nav.history' | 'nav.settings' }> = [
  { id: 'record', labelKey: 'nav.record' },
  { id: 'stats', labelKey: 'nav.stats' },
  { id: 'history', labelKey: 'nav.history' },
  { id: 'settings', labelKey: 'nav.settings' },
]

interface BottomNavProps {
  activeTab: TabId
  onChange: (tab: TabId) => void
}

function BottomNav({ activeTab, onChange }: BottomNavProps) {
  const { t } = useI18n()
  return (
    <nav className={uiBottomNav} aria-label={t('nav.label')}>
      <div className="grid grid-cols-4">
        {tabs.map((tab) => {
          const active = tab.id === activeTab
          const label = t(tab.labelKey)
          return (
            <button
              key={tab.id}
              type="button"
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              title={label}
              className={[
                'flex min-h-11 flex-col items-center justify-center px-1 py-2 transition-colors',
                uiPressable,
                active ? 'ui-nav-active text-brand-400' : 'text-text-secondary hover:text-text-primary',
              ].join(' ')}
              onClick={() => {
                playInteractionSound('tap')
                onChange(tab.id)
              }}
            >
              <NavIcon name={tab.id} />
            </button>
          )
        })}
      </div>
    </nav>
  )
}

interface AppShellProps {
  title: string
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  children: ReactNode
}

export function AppShell({
  title,
  activeTab,
  onTabChange,
  children,
}: AppShellProps) {
  const { t } = useI18n()
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

  return (
    <BottomChromeShell nav={<BottomNav activeTab={activeTab} onChange={onTabChange} />}>
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col bg-surface">
        <SyncStatusBanner onOpenWorkspace={() => setWorkspaceOpen(true)} />
        <header className={[uiHeaderBar, 'px-[var(--ui-page-px)] py-[var(--ui-header-py)]'].join(' ')}>
          <div className="flex items-center justify-between gap-2">
            <h1 className="min-w-0 flex-1 truncate text-base font-bold leading-snug tracking-tight">{title}</h1>
            <AppBrandCredit />
          </div>
        </header>

        <main className="app-main-bottom-pad flex-1 space-y-[var(--ui-section-gap)] px-[var(--ui-page-px)] pt-[var(--ui-page-pt)]">
          {children}
        </main>
      </div>

      <BottomSheet open={workspaceOpen} title={t('workspace.sectionTitle')} onClose={() => setWorkspaceOpen(false)}>
        <WorkspaceHub
          compact
          onClose={() => setWorkspaceOpen(false)}
          onNavigate={() => {
            setWorkspaceOpen(false)
            onTabChange('settings')
          }}
        />
      </BottomSheet>
    </BottomChromeShell>
  )
}
