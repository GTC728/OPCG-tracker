import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CloudSyncTool } from '@/components/settings/CloudSyncTool'
import { DataManagers } from '@/components/settings/DataManagers'
import { DataTools } from '@/components/settings/DataTools'
import { APP_VERSION, SCHEMA_VERSION } from '@/lib/constants'
import { formatDateTime } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'

type SettingsSection = 'overview' | 'players' | 'data' | 'app'

function SettingsCard({
  title,
  description,
  active,
  onClick,
}: {
  title: string
  description: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={[
        'rounded-2xl p-4 text-left ring-1 transition',
        active ? 'bg-brand-600 text-white ring-brand-500' : 'bg-surface-elevated ring-surface-muted',
      ].join(' ')}
      onClick={onClick}
    >
      <p className="font-semibold">{title}</p>
      <p className={['mt-1 text-sm', active ? 'text-brand-100' : 'text-text-secondary'].join(' ')}>
        {description}
      </p>
    </button>
  )
}

export function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>('overview')
  const players = useAppStore((s) => s.players.length)
  const decks = useAppStore((s) => s.decks.length)
  const matches = useAppStore((s) => s.matches.length)
  const activeMatches = useAppStore((s) => s.activeMatches.length)
  const sessions = useAppStore((s) => s.sessions)
  const currentSessionId = useAppStore((s) => s.currentSessionId)
  const createNewSession = useAppStore((s) => s.createNewSession)
  const endCurrentSession = useAppStore((s) => s.endCurrentSession)
  const currentSession = sessions.find((session) => session.id === currentSessionId)

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3">
        <SettingsCard
          title="總覽"
          description="資料與 Session"
          active={section === 'overview'}
          onClick={() => setSection('overview')}
        />
        <SettingsCard
          title="玩家 / Leader"
          description="玩家、別名、封存"
          active={section === 'players'}
          onClick={() => setSection('players')}
        />
        <SettingsCard
          title="匯入 / 清理"
          description="Excel、合併玩家"
          active={section === 'data'}
          onClick={() => setSection('data')}
        />
        <SettingsCard
          title="App 資料"
          description="版本與 Schema"
          active={section === 'app'}
          onClick={() => setSection('app')}
        />
      </section>

      {section === 'overview' ? (
        <>
      <section className="rounded-2xl bg-surface-elevated p-4">
        <h2 className="text-sm font-semibold text-text-secondary">資料概覽</h2>
        <dl className="mt-3 grid grid-cols-4 gap-3 text-center">
          <div>
            <dt className="text-xs text-text-secondary">玩家</dt>
            <dd className="text-2xl font-bold">{players}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-secondary">牌組</dt>
            <dd className="text-2xl font-bold">{decks}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-secondary">對局</dt>
            <dd className="text-2xl font-bold">{matches}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-secondary">進行中</dt>
            <dd className="text-2xl font-bold">{activeMatches}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl bg-surface-elevated p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-text-secondary">目前 Session</h2>
            {currentSession ? (
              <div className="mt-2">
                <p className="text-lg font-semibold">{currentSession.name}</p>
                <p className="mt-1 text-sm text-text-secondary">
                  開始：{formatDateTime(currentSession.startedAt)}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-text-secondary">未有進行中的 session</p>
            )}
          </div>
          <span className="rounded-full bg-surface-muted px-3 py-1 text-xs text-text-secondary">
            {sessions.length} 個
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => createNewSession()}>
            新 Session
          </Button>
          <Button variant="ghost" disabled={!currentSession} onClick={endCurrentSession}>
            結束目前
          </Button>
        </div>
      </section>
        </>
      ) : null}

      {section === 'players' ? <DataManagers /> : null}
      {section === 'data' ? <DataTools /> : null}

      {section === 'app' ? (
        <>
          <CloudSyncTool />
          <section className="rounded-2xl bg-surface-elevated p-4 text-sm text-text-secondary">
            <p>App v{APP_VERSION}</p>
            <p>Schema v{SCHEMA_VERSION}</p>
          </section>
        </>
      ) : null}
    </div>
  )
}
