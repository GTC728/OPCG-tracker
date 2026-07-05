import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/lib/i18n'
import {
  getCloudSession,
  isCloudConfigured,
  loadGroupCloudState,
  loadLatestCloudSnapshot,
  signInWithEmail,
  signOutCloud,
  type GroupCloudState,
  uploadCloudSnapshot,
} from '@/lib/cloudSync'
import { stopGroupCollabRealtime } from '@/lib/groupSync'
import { formatDateTime } from '@/lib/utils'
import { getAppState, useAppStore } from '@/stores/appStore'
import { BackupVersionList } from '@/components/settings/BackupVersionList'

function getDefaultDeviceLabel(): string {
  const platform = navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
  return `OPCG ${platform}`
}

const LOGIN_EMAIL_COOLDOWN_SECONDS = 60

export function CloudSyncTool() {
  const { t } = useI18n()
  const toast = useToast()
  const replaceState = useAppStore((state) => state.replaceState)
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const [email, setEmail] = useState('')
  const [groupCode, setGroupCode] = useState(settings.lastGroupCode ?? '')
  const [connectedGroup, setConnectedGroup] = useState<string | null>(settings.lastGroupCode)
  const [deviceLabel, setDeviceLabel] = useState(settings.deviceLabel ?? getDefaultDeviceLabel)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [groupState, setGroupState] = useState<GroupCloudState | null>(null)
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
      if (user) {
        const latest = await loadLatestCloudSnapshot()
        setLatestBackup(latest?.created_at ?? null)
        if (connectedGroup) {
          const latestGroup = await loadGroupCloudState(connectedGroup)
          setGroupState(latestGroup)
        }
      }
    } catch (caught) {
      const nextMessage = caught instanceof Error ? caught.message : '讀取雲端狀態失敗'
      setMessage(nextMessage)
      toast.error(nextMessage)
    }
  }

  useEffect(() => {
    refreshCloudStatus()
  }, [])

  useEffect(() => {
    if (!settings.lastLoginLinkSentAt) return
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [settings.lastLoginLinkSentAt])

  if (!configured) {
    return (
      <section className="rounded-2xl bg-surface-elevated p-4">
        <h2 className="text-lg font-semibold">{t('cloud.title')}</h2>
        <p className="mt-2 text-sm text-text-secondary">
          {t('cloud.notConfigured')}
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl bg-surface-elevated p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('cloud.title')}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {t('cloud.desc')}
          </p>
        </div>
        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs text-text-secondary">
          {userEmail ? t('cloud.loggedIn') : t('cloud.loggedOut')}
        </span>
      </div>

      {userEmail ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-text-secondary">{userEmail}</p>
          {latestBackup ? (
            <p className="text-sm text-text-secondary">最新備份：{formatDateTime(latestBackup)}</p>
          ) : null}
          <div className="rounded-2xl bg-surface p-3">
            <p className="text-sm font-semibold">{t('cloud.groupShare')}</p>
            <p className="mt-1 text-xs text-text-secondary">
              {t('cloud.groupSecret')}
            </p>
            {connectedGroup ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-text-secondary">
                  {t('cloud.groupLabel')}：{connectedGroup}
                  {groupState ? ` · ${t('cloud.updatedAt')}${formatDateTime(groupState.updated_at)}` : ''}
                </p>
                <p className="rounded-xl bg-brand-500/10 p-3 text-xs text-brand-100">{t('cloud.collabActiveNote')}</p>
                <Button
                  variant="ghost"
                  fullWidth
                  disabled={busy}
                  onClick={() => {
                    stopGroupCollabRealtime()
                    setConnectedGroup(null)
                    setGroupState(null)
                    setGroupCode('')
                    setMessage(null)
                    updateSettings({
                      lastGroupCode: null,
                      groupCollabEnabled: false,
                      groupCollabBootstrapped: false,
                    })
                    toast.info(t('cloud.leftGroup'))
                  }}
                >
                  {t('cloud.leaveGroup')}
                </Button>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <input
                  className="min-h-11 w-full rounded-xl border border-surface-muted bg-surface-elevated px-3"
                  placeholder="群組碼，例如 OPCG-HK-2026"
                  value={groupCode}
                  onChange={(event) => setGroupCode(event.target.value)}
                />
                <Button
                  fullWidth
                  disabled={busy || groupCode.trim().length < 8}
                  loading={busy}
                  onClick={async () => {
                    setBusy(true)
                    setMessage(null)
                    try {
                      const code = groupCode.trim()
                      const latest = await loadGroupCloudState(code)
                      setConnectedGroup(code)
                      setGroupState(latest)
                      updateSettings({
                        lastGroupCode: code,
                        groupCollabEnabled: true,
                        groupCollabBootstrapped: false,
                      })
                      const nextMessage = latest ? '已加入群組' : '新群組，先上傳即可建立資料'
                      setMessage(nextMessage)
                      toast.success(nextMessage)
                    } catch (caught) {
                      const nextMessage = caught instanceof Error ? caught.message : '加入群組失敗'
                      setMessage(nextMessage)
                      toast.error(nextMessage)
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  {t('cloud.joinGroup')}
                </Button>
              </div>
            )}
          </div>
          <label className="block">
            <span className="text-sm text-text-secondary">裝置名稱</span>
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
                  await uploadCloudSnapshot(getAppState(), deviceLabel)
                  setMessage('已備份到雲端')
                  toast.success('已備份到雲端')
                  setVersionRefreshKey((value) => value + 1)
                  await refreshCloudStatus()
                } catch (caught) {
                  const nextMessage = caught instanceof Error ? caught.message : '備份失敗'
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
                const confirmed = window.confirm('會用最新雲端備份覆蓋本機資料，確定還原？')
                if (!confirmed) return
                setBusy(true)
                setMessage(null)
                try {
                  const latest = await loadLatestCloudSnapshot()
                  if (!latest) throw new Error('沒有雲端備份')
                  replaceState(latest.state)
                  setMessage('已從雲端還原')
                  toast.success('已從雲端還原')
                  await refreshCloudStatus()
                } catch (caught) {
                  const nextMessage = caught instanceof Error ? caught.message : '還原失敗'
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
          <div className="mt-4 rounded-2xl bg-surface p-3">
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
                setMessage('已登出')
                toast.info('已登出')
              } catch (caught) {
                const nextMessage = caught instanceof Error ? caught.message : '登出失敗'
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
          <p className="rounded-xl bg-warning/10 p-3 text-sm text-yellow-100">
            {t('cloud.emailLimitNote')}
          </p>
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
                const nextMessage = getFriendlyCloudError(caught, '登入失敗')
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
