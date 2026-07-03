import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CloudSyncTool } from '@/components/settings/CloudSyncTool'
import { DataManagers } from '@/components/settings/DataManagers'
import { DataTools } from '@/components/settings/DataTools'
import { SessionManager } from '@/components/session/SessionManager'
import { APP_VERSION, SCHEMA_VERSION } from '@/lib/constants'
import { languageLabels, useI18n } from '@/lib/i18n'
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
  const [section, setSection] = useState<SettingsSection>('home')
  const players = useAppStore((s) => s.players.length)
  const decks = useAppStore((s) => s.decks.length)
  const matches = useAppStore((s) => s.matches.length)
  const sessions = useAppStore((s) => s.sessions)
  const currentSessionId = useAppStore((s) => s.currentSessionId)
  const activeMatches = useAppStore(
    (s) => s.activeMatches.filter((match) => match.sessionId === s.currentSessionId).length,
  )
  const currentSession = sessions.find((session) => session.id === currentSessionId)

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
              title={t('settings.session')}
              description={t('settings.sessionDesc')}
              meta={currentSession?.name ?? t('settings.noActiveSession')}
              onClick={() => setSection('session')}
            />
            <SettingsRow
              title={t('settings.cloud')}
              description={t('settings.cloudDesc')}
              onClick={() => setSection('cloud')}
            />
            <SettingsRow
              title={t('settings.leaders')}
              description={t('settings.leadersDesc')}
              meta={`${decks}`}
              onClick={() => setSection('leaders')}
            />
            <SettingsRow
              title={t('settings.dataTools')}
              description={t('settings.dataToolsDesc')}
              onClick={() => setSection('data')}
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
          <SessionManager onBackup={() => setSection('cloud')} />
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
