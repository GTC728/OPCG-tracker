import { useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { HistoryPage } from '@/pages/HistoryPage'
import { RecordPage } from '@/pages/RecordPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { StatsPage } from '@/pages/StatsPage'
import { useAppStore } from '@/stores/appStore'
import type { TabId } from '@/types'

const pageMeta: Record<TabId, { title: string; subtitle?: string }> = {
  record: { title: '記錄', subtitle: '快速建立與完成對局' },
  stats: { title: '今日', subtitle: '今晚摘要、洞察與統計' },
  history: { title: '歷史', subtitle: '查詢與修正過往對局' },
  settings: { title: '設定', subtitle: '玩家、牌組與資料管理' },
}

function PageContent({ tab }: { tab: TabId }) {
  switch (tab) {
    case 'record':
      return <RecordPage />
    case 'stats':
      return <StatsPage />
    case 'history':
      return <HistoryPage />
    case 'settings':
      return <SettingsPage />
  }
}

export default function App() {
  const hydrated = useAppStore((s) => s.hydrated)
  const activeTab = useAppStore((s) => s.activeTab)
  const hydrate = useAppStore((s) => s.hydrate)
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (!hydrated) {
    return (
      <div className="flex min-h-full items-center justify-center bg-surface text-text-secondary">
        載入中…
      </div>
    )
  }

  const meta = pageMeta[activeTab]

  return (
    <AppShell
      title={meta.title}
      subtitle={meta.subtitle}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <PageContent tab={activeTab} />
    </AppShell>
  )
}
