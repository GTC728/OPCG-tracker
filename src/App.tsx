import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import {
  getSharedCloudState,
  isCloudConfigured,
  maskPin,
  uploadSharedCloudState,
} from '@/lib/cloudSync'
import { HistoryPage } from '@/pages/HistoryPage'
import { RecordPage } from '@/pages/RecordPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { StatsPage } from '@/pages/StatsPage'
import { getAppState, useAppStore } from '@/stores/appStore'
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

function getDefaultDeviceLabel(): string {
  const platform = navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
  return `OPCG ${platform}`
}

function PinGate({ onReady }: { onReady: () => void }) {
  const replaceState = useAppStore((s) => s.replaceState)
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function connectPin(nextPin: string) {
    setBusy(true)
    setMessage(null)
    try {
      const latest = await getSharedCloudState(nextPin)
      if (latest) {
        replaceState(latest.state)
        setMessage(`已載入共享資料 · ${maskPin(nextPin)}`)
      } else {
        await uploadSharedCloudState(nextPin, getAppState(), getDefaultDeviceLabel())
        setMessage(`已建立新共享資料 · ${maskPin(nextPin)}`)
      }
      sessionStorage.setItem('opcg-shared-pin', nextPin)
      onReady()
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'PIN 連接失敗')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const savedPin = sessionStorage.getItem('opcg-shared-pin')
    if (savedPin) {
      connectPin(savedPin)
    }
  }, [])

  return (
    <div className="flex min-h-full items-center justify-center bg-surface p-5 text-text-primary">
      <section className="w-full max-w-sm rounded-3xl bg-surface-elevated p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">OPCG Tracker</p>
        <h1 className="mt-2 text-2xl font-bold">輸入共享 PIN</h1>
        <p className="mt-2 text-sm text-text-secondary">
          同一組 PIN 會使用同一份共享資料；第一次使用會自動建立。
        </p>
        <input
          className="mt-5 min-h-12 w-full rounded-xl border border-surface-muted bg-surface px-4"
          placeholder="例如 OPCG-2026"
          type="password"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
        />
        <Button
          className="mt-4"
          fullWidth
          disabled={busy || pin.trim().length < 4}
          onClick={() => connectPin(pin.trim())}
        >
          進入
        </Button>
        {message ? <p className="mt-3 text-sm text-text-secondary">{message}</p> : null}
      </section>
    </div>
  )
}

export default function App() {
  const hydrated = useAppStore((s) => s.hydrated)
  const activeTab = useAppStore((s) => s.activeTab)
  const hydrate = useAppStore((s) => s.hydrate)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const [cloudReady, setCloudReady] = useState(!isCloudConfigured())

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

  if (!cloudReady) {
    return <PinGate onReady={() => setCloudReady(true)} />
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
