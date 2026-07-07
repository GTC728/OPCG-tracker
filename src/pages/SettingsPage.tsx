import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { AppearanceSettings } from '@/components/settings/AppearanceSettings'
import { CloudSyncTool } from '@/components/settings/CloudSyncTool'
import { ProfileSettings } from '@/components/settings/ProfileSettings'
import { DataManagers } from '@/components/settings/DataManagers'
import { DataTools } from '@/components/settings/DataTools'
import { SessionManager } from '@/components/session/SessionManager'
import { APP_VERSION, SCHEMA_VERSION } from '@/lib/constants'
import {
  countListedPlayers,
  countVisibleActiveMatches,
  countVisibleMatches,
} from '@/lib/entityVisibility'
import { languageLabels, useI18n } from '@/lib/i18n'
import type { Language } from '@/types'
import { useAppStore } from '@/stores/appStore'

type SettingsSection = 'home' | 'session' | 'language' | 'players' | 'leaders' | 'data' | 'cloud' | 'profile' | 'appearance'

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
      className="flex w-full items-center gap-3 rounded-xl bg-surface-elevated px-3 py-2.5 text-left ring-1 ring-surface-muted transition hover:bg-surface-muted active:scale-[0.99]"
      onClick={onClick}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs text-text-secondary line-clamp-1">{description}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-text-secondary">
        {meta ? <span className="max-w-[6.5rem] truncate tabular-nums">{meta}</span> : null}
        <span aria-hidden className="text-sm leading-none">›</span>
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
  const appState = useAppStore()
  const playerCount = countListedPlayers(appState)
  const deckCount = appState.decks.filter((deck) => !deck.archived).length
  const matchCount = countVisibleMatches(appState)
  const sessions = appState.sessions
  const currentSessionId = appState.currentSessionId
  const activeMatches = countVisibleActiveMatches(appState, currentSessionId ?? undefined)
  const currentSession = sessions.find((session) => session.id === currentSessionId)

  return (
    <div className="space-y-3">
      {section === 'home' ? (
        <>
          <section className="rounded-xl bg-surface-elevated p-3">
            <h2 className="text-xs font-semibold text-text-secondary">{t('settings.dataOverview')}</h2>
            <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
              <div>
                <dt className="text-[10px] text-text-secondary">{t('settings.playersCount')}</dt>
                <dd className="text-xl font-bold">{playerCount}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-text-secondary">{t('settings.decksCount')}</dt>
                <dd className="text-xl font-bold">{deckCount}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-text-secondary">{t('settings.matchesCount')}</dt>
                <dd className="text-xl font-bold">{matchCount}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-text-secondary">{t('settings.activeCount')}</dt>
                <dd className="text-xl font-bold">{activeMatches}</dd>
              </div>
            </dl>
          </section>

          <section className="space-y-1.5">
            <SettingsRow
              title={t('settings.profile')}
              description={t('settings.profileDesc')}
              onClick={() => setSection('profile')}
            />
            <SettingsRow
              title={t('settings.appearance')}
              description={t('settings.appearanceDesc')}
              onClick={() => setSection('appearance')}
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
              meta={`${playerCount}`}
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
              meta={`${deckCount}`}
              onClick={() => setSection('leaders')}
            />
            <SettingsRow
              title={t('settings.dataTools')}
              description={t('settings.dataToolsDesc')}
              onClick={() => setSection('data')}
            />
          </section>
          <section className="rounded-xl bg-surface-elevated p-3 text-sm text-text-secondary">
            <h2 className="text-sm font-semibold text-text-primary">{t('settings.about')}</h2>
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

      {section === 'profile' ? (
        <>
          <BackButton label={t('settings.back')} onClick={() => setSection('home')} />
          <ProfileSettings />
        </>
      ) : null}

      {section === 'appearance' ? (
        <>
          <BackButton label={t('settings.back')} onClick={() => setSection('home')} />
          <AppearanceSettings />
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
