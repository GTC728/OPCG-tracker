import { useEffect, useState } from 'react'
import { GroupLobbyHub, type LobbyNavigateTarget } from '@/components/lobby/GroupLobbyHub'
import { GroupClanRoster } from '@/components/lobby/GroupClanRoster'
import { AccountBackupPanel } from '@/components/settings/AccountBackupPanel'
import { AppearanceSettings } from '@/components/settings/AppearanceSettings'
import { DataManagers } from '@/components/settings/DataManagers'
import { DataTools } from '@/components/settings/DataTools'
import { GroupMembershipPanel } from '@/components/settings/GroupMembershipPanel'
import { GroupSyncSection } from '@/components/settings/GroupSyncSection'
import { ProfileSettings } from '@/components/settings/ProfileSettings'
import { PwaInstallPanel } from '@/components/settings/PwaInstallPanel'
import { SystemStatusPanel } from '@/components/settings/SystemStatusPanel'
import { SessionManager } from '@/components/session/SessionManager'
import { Button } from '@/components/ui/Button'
import { APP_VERSION, SCHEMA_VERSION } from '@/lib/constants'
import { AppCredit } from '@/components/layout/AppCredit'
import {
  countListedPlayers,
} from '@/lib/entityVisibility'
import { groupRoleLabel } from '@/lib/groupPermissions'
import { languageLabels, useI18n } from '@/lib/i18n'
import type { Language } from '@/types'
import { consumePendingOpenPwaInstallPage, PWA_OPEN_INSTALL_EVENT } from '@/lib/pwaInstall'
import { getAppState, useAppStore } from '@/stores/appStore'

type SettingsSection =
  | 'home'
  | 'workspace'
  | 'workspace-session'
  | 'workspace-players'
  | 'workspace-members'
  | 'workspace-sync'
  | 'workspace-join'
  | 'lobby-browse'
  | 'lobby-session'
  | 'lobby-players'
  | 'lobby-sync'
  | 'account'
  | 'profile'
  | 'appearance'
  | 'language'
  | 'leaders'
  | 'data'
  | 'install-app'
  | 'system'

import { GroupedListRow, GroupedListSection } from '@/components/ui/GroupedList'
import { PageHero } from '@/components/ui/PageHero'
import { WorkspaceHeroCard } from '@/components/ui/WorkspaceHeroCard'
import { PushStage } from '@/components/motion/PushStage'

function settingsBackSection(section: SettingsSection): SettingsSection {
  if (
    section === 'lobby-session' ||
    section === 'lobby-players' ||
    section === 'lobby-sync' ||
    section === 'workspace-session' ||
    section === 'workspace-players' ||
    section === 'workspace-members' ||
    section === 'workspace-sync' ||
    section === 'workspace-join'
  ) {
    return 'lobby-browse'
  }
  return 'home'
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
  const lastGroupCode = useAppStore((state) => state.settings.lastGroupCode)
  const groupMemberRole = useAppStore((state) => state.settings.groupMemberRole)
  const profileDisplayName = useAppStore((state) => state.settings.profileDisplayName)
  const lastGroupSyncAt = useAppStore((state) => state.settings.lastGroupSyncAt)
  const decks = useAppStore((state) => state.decks)
  const playerCount = countListedPlayers(getAppState())
  const deckCount = decks.filter((deck) => !deck.archived).length

  const workspaceMeta = lastGroupCode
    ? `${lastGroupCode}${groupMemberRole ? ` · ${groupRoleLabel(groupMemberRole)}` : ''}`
    : t('workspace.local')

  const workspaceTitle = profileDisplayName?.trim() || lastGroupCode || t('workspace.local')
  const workspaceSubtitle = lastGroupCode
    ? lastGroupSyncAt
      ? t('systemStatus.bannerSynced').replace(
          '{time}',
          new Date(lastGroupSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        )
      : `${playerCount} ${t('settings.playersCount')}`
    : t('workspace.localDataNote')

  const navigateLobby = (target: LobbyNavigateTarget) => {
    setSection(`lobby-${target}` as SettingsSection)
  }

  useEffect(() => {
    const openInstall = () => setSection('install-app')
    if (consumePendingOpenPwaInstallPage()) openInstall()
    window.addEventListener(PWA_OPEN_INSTALL_EVENT, openInstall)
    return () => window.removeEventListener(PWA_OPEN_INSTALL_EVENT, openInstall)
  }, [])

  return (
    <div className="space-y-5">
      {section === 'home' ? (
        <>
          <PageHero title={t('page.settings.title')} subtitle={t('page.settings.subtitle')} />

          <WorkspaceHeroCard
            title={workspaceTitle}
            subtitle={workspaceSubtitle}
            pillLabel={lastGroupCode ? t('lobby.title') : undefined}
            onClick={lastGroupCode ? () => setSection('lobby-browse') : undefined}
          />

          <GroupedListSection title={t('workspace.personalSection')} variant="separated">
            <GroupedListRow
              variant="separated"
              title={t('settings.profile')}
              onClick={() => setSection('profile')}
            />
            <GroupedListRow
              variant="separated"
              title={t('settings.appearance')}
              onClick={() => setSection('appearance')}
            />
            <GroupedListRow
              variant="separated"
              title={t('settings.language')}
              meta={languageLabels.find((item) => item.value === language)?.label}
              onClick={() => setSection('language')}
            />
          </GroupedListSection>

          <GroupedListSection title={t('workspace.groupSection')} variant="separated">
            <GroupedListRow
              variant="separated"
              title={t('lobby.title')}
              meta={workspaceMeta}
              onClick={() => setSection('lobby-browse')}
            />
            <GroupedListRow
              variant="separated"
              title={t('workspace.syncStatus')}
              onClick={() => setSection('lobby-sync')}
            />
            <GroupedListRow
              variant="separated"
              title={t('settings.leaders')}
              meta={`${deckCount}`}
              onClick={() => setSection('leaders')}
            />
          </GroupedListSection>

          <GroupedListSection title={t('workspace.dataSection')} variant="separated">
            <GroupedListRow
              variant="separated"
              title={t('workspace.accountTitle')}
              onClick={() => setSection('account')}
            />
            <GroupedListRow
              variant="separated"
              title={t('settings.dataTools')}
              onClick={() => setSection('data')}
            />
            <GroupedListRow
              variant="separated"
              title={t('settings.installApp')}
              onClick={() => setSection('install-app')}
            />
            <GroupedListRow
              variant="separated"
              title={t('settings.system')}
              onClick={() => setSection('system')}
            />
          </GroupedListSection>

          <section className="rounded-xl bg-surface-elevated p-3 text-sm text-text-secondary">
            <h2 className="text-sm font-semibold text-text-primary">{t('settings.about')}</h2>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div>
                <p>App v{APP_VERSION}</p>
                <p>Schema v{SCHEMA_VERSION}</p>
              </div>
              <AppCredit />
            </div>
          </section>
        </>
      ) : (
        <PushStage key={section} className="space-y-5" onBack={() => setSection(settingsBackSection(section))}>
      {section === 'lobby-browse' ? (
        <>
          <BackButton label={t('settings.back')} onClick={() => setSection('home')} />
          <GroupLobbyHub onNavigate={navigateLobby} />
        </>
      ) : null}

      {section === 'lobby-session' ? (
        <>
          <BackButton label={t('lobby.title')} onClick={() => setSection('lobby-browse')} />
          <SessionManager onBackup={() => setSection('account')} />
        </>
      ) : null}

      {section === 'lobby-players' ? (
        <>
          <BackButton label={t('lobby.title')} onClick={() => setSection('lobby-browse')} />
          <GroupClanRoster />
        </>
      ) : null}

      {section === 'lobby-sync' ? (
        <>
          <BackButton label={t('lobby.title')} onClick={() => setSection('lobby-browse')} />
          <GroupSyncSection />
        </>
      ) : null}

      {section === 'workspace' ? (
        <>
          <BackButton label={t('settings.back')} onClick={() => setSection('home')} />
          <GroupLobbyHub onNavigate={navigateLobby} />
        </>
      ) : null}

      {section === 'workspace-session' ? (
        <>
          <BackButton label={t('lobby.title')} onClick={() => setSection('lobby-browse')} />
          <SessionManager onBackup={() => setSection('account')} />
        </>
      ) : null}

      {section === 'workspace-players' ? (
        <>
          <BackButton label={t('lobby.title')} onClick={() => setSection('lobby-browse')} />
          <DataManagers mode="players" />
        </>
      ) : null}

      {section === 'workspace-sync' ? (
        <>
          <BackButton label={t('lobby.title')} onClick={() => setSection('lobby-browse')} />
          <GroupSyncSection />
        </>
      ) : null}

      {section === 'workspace-join' ? (
        <>
          <BackButton label={t('lobby.title')} onClick={() => setSection('lobby-browse')} />
          <GroupMembershipPanel />
        </>
      ) : null}

      {section === 'account' ? (
        <>
          <BackButton label={t('settings.back')} onClick={() => setSection('home')} />
          <AccountBackupPanel />
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

      {section === 'install-app' ? (
        <>
          <BackButton label={t('settings.back')} onClick={() => setSection('home')} />
          <PwaInstallPanel />
        </>
      ) : null}

      {section === 'system' ? (
        <>
          <BackButton label={t('settings.back')} onClick={() => setSection('home')} />
          <SystemStatusPanel />
        </>
      ) : null}
        </PushStage>
      )}
    </div>
  )
}
