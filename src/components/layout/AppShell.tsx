import { type ReactNode } from 'react'
import type { TabId } from '@/types'

const tabs: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'record', label: '記錄', icon: '⚔️' },
  { id: 'stats', label: '今日', icon: '📊' },
  { id: 'history', label: '歷史', icon: '📜' },
  { id: 'settings', label: '設定', icon: '⚙️' },
]

interface BottomNavProps {
  activeTab: TabId
  onChange: (tab: TabId) => void
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-surface-muted bg-surface/95 backdrop-blur">
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {tabs.map((tab) => {
          const active = tab.id === activeTab
          return (
            <button
              key={tab.id}
              type="button"
              className={[
                'flex min-h-16 flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium transition-colors',
                active ? 'text-brand-500' : 'text-text-secondary hover:text-text-primary',
              ].join(' ')}
              onClick={() => onChange(tab.id)}
            >
              <span className="text-lg" aria-hidden>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
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
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-col bg-surface">
      <header className="sticky top-0 z-20 border-b border-surface-muted bg-surface/95 px-5 py-4 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-500">OPCG Tracker</p>
        <h1 className="mt-1 text-2xl font-bold">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
      </header>

      <main className="flex-1 px-5 pb-28 pt-4">{children}</main>

      <BottomNav activeTab={activeTab} onChange={onTabChange} />
    </div>
  )
}
