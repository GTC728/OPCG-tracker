import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/lib/i18n'
import {
  getCloudSession,
  isCloudConfigured,
  loadLatestCloudSnapshot,
  signInWithEmail,
  signOutCloud,
} from '@/lib/cloudSync'
import { ensurePersonalProfileFromLogin } from '@/lib/personalProfile'
import { backupAgeDays, needsBackupReminder, runAutoCloudBackup, shouldAutoBackupOnLogin } from '@/lib/autoBackup'
import { syncAchievementLedger } from '@/lib/achievementLedgerSync'
import { prepareRestoredAppState } from '@/lib/restoreState'
import { formatDateTime } from '@/lib/utils'
import { getAppState, useAppStore } from '@/stores/appStore'
import { BackupVersionList } from '@/components/settings/BackupVersionList'

function getDefaultDeviceLabel(): string {
  const platform = navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
  return `OPCG ${platform}`
}

const LOGIN_EMAIL_COOLDOWN_SECONDS = 60

export function AccountBackupPanel() {
  const { t } = useI18n()
  const toast = useToast()
  const replaceState = useAppStore((state) => state.replaceState)
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const [email, setEmail] = useState('')
  const [deviceLabel, setDeviceLabel] = useState(settings.deviceLabel ?? getDefaultDeviceLabel)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [latestBackup, setLatestBackup] = useState<string | null>(null)
  const [versionRefreshKey, setVersionRefreshKey] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const configured = isCloudConfigured()
  const loginCooldownSeconds = settings.lastLoginLinkSentAt
    ? Math.max(
        0,
        LOGIN_EMAIL_COOLDOWN_SECONDS -
          Math.floor((now - new Date(settings.lastLoginLinkSentAt).getTime()) / 1000),
      )
    : 0

  function getFriendlyCloudError(caught: unknown, fallback: string): string {
    const rawMessage = caught instanceof Error ? caught.message : fallback
    return rawMessage.toLowerCase().includes('rate limit') ? t('cloud.rateLimited') : rawMessage
  }

  async function refreshCloudStatus() {
    if (!configured) return
    try {
      const { user } = await getCloudSession()
      setUserEmail(user?.email ?? null)
      updateSettings({ cloudUserId: user?.id ?? null })
      if (user) {
        const current = getAppState()
        const withProfile = ensurePersonalProfileFromLogin(current, user.email)
        if (withProfile !== current) {
          replaceState(withProfile)
        }
        if (shouldAutoBackupOnLogin(getAppState())) {
          try {
            const backed = await runAutoCloudBackup(getAppState(), deviceLabel)
            replaceState(backed)
            toast.info(t('workspace.autoBackupDone'))
          } catch {
            // non-blocking
          }
        }
        try {
          const synced = await syncAchievementLedger(getAppState())
          replaceState(synced)
        } catch {
          // non-blocking
        }
        const latest = await loadLatestCloudSnapshot()
        setLatestBackup(latest?.created_at ?? null)
      }
    } catch (caught) {
      const nextMessage = caught instanceof Error ? caught.message : t('workspace.cloudStatusFailed')
      setMessage(nextMessage)
      toast.error(nextMessage)
    }
  }

  useEffect(() => {
    void refreshCloudStatus()
  }, [])

  useEffect(() => {
    if (!settings.lastLoginLinkSentAt) return
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [settings.lastLoginLinkSentAt])

  if (!configured) {
    return (
      <section className="rounded-2xl bg-surface-elevated p-4">
        <h2 className="text-lg font-semibold">{t('workspace.accountTitle')}</h2>
        <p className="mt-2 text-sm text-text-secondary">{t('cloud.notConfigured')}</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl bg-surface-elevated p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('workspace.accountTitle')}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t('workspace.accountDesc')}</p>
        </div>
        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs text-text-secondary">
          {userEmail ? t('cloud.loggedIn') : t('cloud.loggedOut')}
        </span>
      </div>

      {userEmail ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-text-secondary">{userEmail}</p>
          {latestBackup ? (
            <p className="text-sm text-text-secondary">
              {t('workspace.latestBackup')}: {formatDateTime(latestBackup)}
            </p>
          ) : (
            <p className="rounded-xl bg-warning/10 p-3 text-sm text-amber-100">{t('workspace.noBackupYet')}</p>
          )}
          {needsBackupReminder(getAppState()) && latestBackup ? (
            <p className="rounded-xl bg-warning/10 p-2 text-xs text-amber-100">
              {t('workspace.backupStale').replace('{n}', String(backupAgeDays(getAppState()) ?? '?'))}
            </p>
          ) : null}
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={settings.autoBackupOnLogin !== false}
              onChange={(event) => updateSettings({ autoBackupOnLogin: event.target.checked })}
            />
            {t('workspace.autoBackupOnLogin')}
          </label>
          <label className="block">
            <span className="text-sm text-text-secondary">{t('systemStatus.device')}</span>
            <input
              className="mt-2 min-h-11 w-full rounded-xl border border-surface-muted bg-surface px-3"
              value={deviceLabel}
              onChange={(event) => {
                const nextLabel = event.target.value
                setDeviceLabel(nextLabel)
                updateSettings({ deviceLabel: nextLabel })
              }}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              disabled={busy}
              loading={busy}
              onClick={async () => {
                setBusy(true)
                setMessage(null)
                try {
                  const backed = await runAutoCloudBackup(getAppState(), deviceLabel)
                  replaceState(backed)
                  setMessage(t('cloud.backupDone'))
                  toast.success(t('cloud.backupDone'))
                  setVersionRefreshKey((value) => value + 1)
                  await refreshCloudStatus()
                } catch (caught) {
                  const nextMessage = caught instanceof Error ? caught.message : t('cloud.backupFailed')
                  setMessage(nextMessage)
                  toast.error(nextMessage)
                } finally {
                  setBusy(false)
                }
              }}
            >
              {t('cloud.backup')}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              loading={busy}
              onClick={async () => {
                const confirmed = window.confirm(t('workspace.restoreConfirm'))
                if (!confirmed) return
                setBusy(true)
                setMessage(null)
                try {
                  const latest = await loadLatestCloudSnapshot()
                  if (!latest) throw new Error(t('workspace.noCloudBackup'))
                  replaceState(prepareRestoredAppState(latest.state))
                  setMessage(t('cloud.restoreDone'))
                  toast.success(t('cloud.restoreDone'))
                  await refreshCloudStatus()
                } catch (caught) {
                  const nextMessage = caught instanceof Error ? caught.message : t('cloud.restoreFailed')
                  setMessage(nextMessage)
                  toast.error(nextMessage)
                } finally {
                  setBusy(false)
                }
              }}
            >
              {t('cloud.restore')}
            </Button>
          </div>
          <div className="rounded-2xl bg-surface p-3">
            <BackupVersionList
              key={`personal-${versionRefreshKey}`}
              mode="personal"
              onRestored={refreshCloudStatus}
            />
          </div>
          <Button
            variant="ghost"
            fullWidth
            disabled={busy}
            loading={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await signOutCloud()
                setUserEmail(null)
                setLatestBackup(null)
                setMessage(t('cloud.signOutDone'))
                toast.info(t('cloud.signOutDone'))
              } catch (caught) {
                const nextMessage = caught instanceof Error ? caught.message : t('cloud.signOutFailed')
                setMessage(nextMessage)
                toast.error(nextMessage)
              } finally {
                setBusy(false)
              }
            }}
          >
            {t('cloud.signOut')}
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="rounded-xl bg-warning/10 p-3 text-sm text-yellow-100">{t('cloud.emailLimitNote')}</p>
          <input
            className="min-h-11 w-full rounded-xl border border-surface-muted bg-surface px-3"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button
            fullWidth
            disabled={busy || !email.trim() || loginCooldownSeconds > 0}
            loading={busy}
            onClick={async () => {
              setBusy(true)
              setMessage(null)
              try {
                await signInWithEmail(email)
                const sentAt = new Date().toISOString()
                updateSettings({ lastLoginLinkSentAt: sentAt })
                setNow(Date.now())
                setMessage(t('cloud.checkEmail'))
                toast.success(t('cloud.checkEmail'))
              } catch (caught) {
                const nextMessage = getFriendlyCloudError(caught, t('cloud.loginFailed'))
                setMessage(nextMessage)
                toast.error(nextMessage)
              } finally {
                setBusy(false)
              }
            }}
          >
            {loginCooldownSeconds > 0
              ? `${t('cloud.resendIn')} ${loginCooldownSeconds}s`
              : t('cloud.sendLogin')}
          </Button>
        </div>
      )}

      {message ? <p className="mt-3 text-sm text-text-secondary">{message}</p> : null}
    </section>
  )
}
