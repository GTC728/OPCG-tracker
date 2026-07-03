import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { CloudSyncTool } from '@/components/settings/CloudSyncTool'
import { DataManagers } from '@/components/settings/DataManagers'
import { DataTools } from '@/components/settings/DataTools'
import { APP_VERSION, SCHEMA_VERSION } from '@/lib/constants'
import { languageLabels, useI18n } from '@/lib/i18n'
import { formatDateTime } from '@/lib/utils'
import type { Language } from '@/types'
import { useAppStore } from '@/stores/appStore'

type SettingsSection = 'home' | 'session' | 'language' | 'players' | 'leaders' | 'data' | 'cloud'

function SettingsRow({
  title,
  description,
  meta,
  onClick,
}: {
  title: string
  description: string
  meta?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface-elevated p-4 text-left ring-1 ring-surface-muted transition hover:bg-surface-muted active:scale-[0.99]"
      onClick={onClick}
    >
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-1 block text-sm text-text-secondary">{description}</span>
      </span>
      <span className="shrink-0 text-right text-sm text-text-secondary">
        {meta ? <span className="block">{meta}</span> : null}
        <span aria-hidden>›</span>
      </span>
    </button>
  )
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="ghost" className="min-h-10 py-2 text-sm" onClick={onClick}>
      ← {label}
    </Button>
  )
}

export function SettingsPage() {
  const { t, language, setLanguage } = useI18n()
  const toast = useToast()
  const [section, setSection] = useState<SettingsSection>('home')
  const players = useAppStore((s) => s.players.length)
  const decks = useAppStore((s) => s.decks.length)
  const matches = useAppStore((s) => s.matches.length)
  const activeMatches = useAppStore((s) => s.activeMatches.length)
  const sessions = useAppStore((s) => s.sessions)
  const currentSessionId = useAppStore((s) => s.currentSessionId)
  const createNewSession = useAppStore((s) => s.createNewSession)
  const updateSessionName = useAppStore((s) => s.updateSessionName)
  const switchSession = useAppStore((s) => s.switchSession)
  const endCurrentSession = useAppStore((s) => s.endCurrentSession)
  const currentSession = sessions.find((session) => session.id === currentSessionId)
  const sortedSessions = [...sessions].sort(
    (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
  )
  const [sessionName, setSessionName] = useState(currentSession?.name ?? '')

  useEffect(() => {
    setSessionName(currentSession?.name ?? '')
  }, [currentSession?.id, currentSession?.name])

  return (
    <div className="space-y-4">
      {section === 'home' ? (
        <>
          <section className="rounded-2xl bg-surface-elevated p-4">
            <h2 className="text-sm font-semibold text-text-secondary">{t('settings.dataOverview')}</h2>
            <dl className="mt-3 grid grid-cols-4 gap-3 text-center">
              <div>
                <dt className="text-xs text-text-secondary">{t('settings.playersCount')}</dt>
                <dd className="text-2xl font-bold">{players}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary">{t('settings.decksCount')}</dt>
                <dd className="text-2xl font-bold">{decks}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary">{t('settings.matchesCount')}</dt>
                <dd className="text-2xl font-bold">{matches}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-secondary">{t('settings.activeCount')}</dt>
                <dd className="text-2xl font-bold">{activeMatches}</dd>
              </div>
            </dl>
          </section>

          <section className="space-y-2">
            <SettingsRow
              title={t('settings.session')}
              description={t('settings.sessionDesc')}
              meta={currentSession?.name ?? t('settings.noActiveSession')}
              onClick={() => setSection('session')}
            />
            <SettingsRow
              title={t('settings.language')}
              description={t('settings.languageDesc')}
              meta={languageLabels.find((item) => item.value === language)?.label}
              onClick={() => setSection('language')}
            />
            <SettingsRow
              title={t('settings.players')}
              description={t('settings.playersDesc')}
              meta={`${players}`}
              onClick={() => setSection('players')}
            />
            <SettingsRow
              title="Leader 管理"
              description="Leader database, aliases, and archive"
              meta={`${decks}`}
              onClick={() => setSection('leaders')}
            />
            <SettingsRow
              title={t('settings.dataTools')}
              description={t('settings.dataToolsDesc')}
              onClick={() => setSection('data')}
            />
            <SettingsRow
              title={t('settings.cloud')}
              description={t('settings.cloudDesc')}
              onClick={() => setSection('cloud')}
            />
          </section>
          <section className="rounded-2xl bg-surface-elevated p-4 text-sm text-text-secondary">
            <h2 className="text-base font-semibold text-text-primary">{t('settings.about')}</h2>
            <p className="mt-2">App v{APP_VERSION}</p>
            <p>Schema v{SCHEMA_VERSION}</p>
          </section>
        </>
      ) : null}

      {section === 'session' ? (
        <>
          <BackButton label={t('settings.back')} onClick={() => setSection('home')} />
          <section className="rounded-2xl bg-surface-elevated p-4">
            <h2 className="text-lg font-semibold">{t('settings.session')}</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {currentSession ? `${t('record.start')}：${formatDateTime(currentSession.startedAt)}` : t('settings.noActiveSession')}
            </p>
            <label className="mt-4 block">
              <span className="text-sm text-text-secondary">{t('settings.sessionName')}</span>
              <input
                className="mt-2 min-h-12 w-full rounded-xl border border-surface-muted bg-surface px-3 text-text-primary"
                disabled={!currentSession}
                value={sessionName}
                onChange={(event) => setSessionName(event.target.value)}
              />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                disabled={!currentSession || !sessionName.trim()}
                onClick={() => {
                  if (!currentSession) return
                  try {
                    updateSessionName(currentSession.id, sessionName)
                    toast.success('Session 名稱已更新')
                  } catch (caught) {
                    toast.error(caught instanceof Error ? caught.message : 'Session 改名失敗')
                  }
                }}
              >
                {t('settings.renameSession')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const session = createNewSession()
                  setSessionName(session.name)
                  toast.success('已建立新 Session')
                }}
              >
                {t('settings.newSession')}
              </Button>
            </div>
            <Button
              className="mt-3"
              variant="ghost"
              fullWidth
              disabled={!currentSession}
              onClick={() => {
                endCurrentSession()
                toast.success('Session 已結束')
              }}
            >
              {t('settings.endCurrent')}
            </Button>
            <p className="mt-3 text-xs text-text-secondary">
              {t('settings.totalSessions')}：{sessions.length}
            </p>
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold text-text-secondary">切換 Session</h3>
              {sortedSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={[
                    'flex w-full items-center justify-between gap-3 rounded-xl p-3 text-left text-sm ring-1 ring-surface-muted',
                    session.id === currentSessionId ? 'bg-brand-600 text-white' : 'bg-surface hover:bg-surface-muted',
                  ].join(' ')}
                  onClick={() => {
                    try {
                      switchSession(session.id)
                      toast.success(`已切換到 ${session.name}`)
                    } catch (caught) {
                      toast.error(caught instanceof Error ? caught.message : '切換 Session 失敗')
                    }
                  }}
                >
                  <span>
                    <span className="block font-semibold">{session.name}</span>
                    <span className="mt-1 block text-xs opacity-75">
                      {formatDateTime(session.startedAt)}
                    </span>
                  </span>
                  <span className="text-xs opacity-75">
                    {session.id === currentSessionId ? '目前' : session.endedAt ? '已結束' : '開啟中'}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {section === 'players' ? (
        <>
          <BackButton label={t('settings.back')} onClick={() => setSection('home')} />
          <DataManagers mode="players" />
        </>
      ) : null}

      {section === 'leaders' ? (
        <>
          <BackButton label={t('settings.back')} onClick={() => setSection('home')} />
          <DataManagers mode="leaders" />
        </>
      ) : null}

      {section === 'data' ? (
        <>
          <BackButton label={t('settings.back')} onClick={() => setSection('home')} />
          <DataTools />
        </>
      ) : null}

      {section === 'cloud' ? (
        <>
          <BackButton label={t('settings.back')} onClick={() => setSection('home')} />
          <CloudSyncTool />
        </>
      ) : null}

      {section === 'language' ? (
        <>
          <BackButton label={t('settings.back')} onClick={() => setSection('home')} />
          <section className="rounded-2xl bg-surface-elevated p-4">
            <h2 className="text-lg font-semibold">{t('settings.language')}</h2>
            <p className="mt-1 text-sm text-text-secondary">{t('settings.languageDesc')}</p>
            <select
              className="mt-3 min-h-12 w-full rounded-xl border border-surface-muted bg-surface px-3 text-text-primary"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              {languageLabels.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </section>
        </>
      ) : null}
    </div>
  )
}
