import { type ReactNode } from 'react'
import { BottomChromeShell } from '@/components/layout/BottomChrome'
import { SyncStatusBanner } from '@/components/layout/SyncStatusBanner'
import { useI18n } from '@/lib/i18n'
import type { TabId } from '@/types'

function NavIcon({ name }: { name: TabId }) {
  const className = 'h-4 w-4'
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
    <nav className="border-t border-surface-muted/80">
      <div className="grid grid-cols-4">
        {tabs.map((tab) => {
          const active = tab.id === activeTab
          return (
            <button
              key={tab.id}
              type="button"
              className={[
                'flex min-h-9 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[9px] font-medium leading-none transition-colors',
                active ? 'text-brand-500' : 'text-text-secondary hover:text-text-primary',
              ].join(' ')}
              onClick={() => onChange(tab.id)}
            >
              <NavIcon name={tab.id} />
              <span>{t(tab.labelKey)}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

interface AppShellProps {
  title: string
  subtitle?: string
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  children: ReactNode
}

export function AppShell({
  title,
  subtitle,
  activeTab,
  onTabChange,
  children,
}: AppShellProps) {
  return (
    <BottomChromeShell nav={<BottomNav activeTab={activeTab} onChange={onTabChange} />}>
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col bg-surface">
        <SyncStatusBanner />
        <header className="sticky top-0 z-20 border-b border-surface-muted bg-surface/95 px-5 py-4 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-500">OPCG Tracker</p>
          <h1 className="mt-1 text-2xl font-bold">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
        </header>

        <main className="app-main-bottom-pad flex-1 px-5 pt-4">{children}</main>
      </div>
    </BottomChromeShell>
  )
}
