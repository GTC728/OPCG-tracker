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
  uploadGroupCloudState,
} from '@/lib/cloudSync'
import { formatDateTime } from '@/lib/utils'
import { getAppState, useAppStore } from '@/stores/appStore'

function getDefaultDeviceLabel(): string {
  const platform = navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
  return `OPCG ${platform}`
}

export function CloudSyncTool() {
  const { t } = useI18n()
  const toast = useToast()
  const replaceState = useAppStore((state) => state.replaceState)
  const [email, setEmail] = useState('')
  const [groupCode, setGroupCode] = useState('')
  const [connectedGroup, setConnectedGroup] = useState<string | null>(null)
  const [deviceLabel, setDeviceLabel] = useState(getDefaultDeviceLabel)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [groupState, setGroupState] = useState<GroupCloudState | null>(null)
  const [latestBackup, setLatestBackup] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const configured = isCloudConfigured()

  async function refreshCloudStatus() {
    if (!configured) return
    try {
      const { user } = await getCloudSession()
      setUserEmail(user?.email ?? null)
      if (user) {
        const latest = await loadLatestCloudSnapshot()
        setLatestBackup(latest?.created_at ?? null)
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
                  群組：{connectedGroup}
                  {groupState ? ` · 更新：${formatDateTime(groupState.updated_at)}` : ''}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    disabled={busy}
                    loading={busy}
                    onClick={async () => {
                      setBusy(true)
                      setMessage(null)
                      try {
                        await uploadGroupCloudState(connectedGroup, getAppState(), deviceLabel)
                        const latest = await loadGroupCloudState(connectedGroup)
                        setGroupState(latest)
                        setMessage('已上傳到群組')
                        toast.success('已上傳到群組')
                      } catch (caught) {
                        const nextMessage = caught instanceof Error ? caught.message : '群組上傳失敗'
                        setMessage(nextMessage)
                        toast.error(nextMessage)
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    {t('cloud.uploadGroup')}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    loading={busy}
                    onClick={async () => {
                      const confirmed = window.confirm('會用群組資料覆蓋本機資料，確定下載？')
                      if (!confirmed) return
                      setBusy(true)
                      setMessage(null)
                      try {
                        const latest = await loadGroupCloudState(connectedGroup)
                        if (!latest) throw new Error('群組還沒有資料')
                        replaceState(latest.state)
                        setGroupState(latest)
                        setMessage('已下載群組資料')
                        toast.success('已下載群組資料')
                      } catch (caught) {
                        const nextMessage = caught instanceof Error ? caught.message : '群組下載失敗'
                        setMessage(nextMessage)
                        toast.error(nextMessage)
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    {t('cloud.downloadGroup')}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  fullWidth
                  disabled={busy}
                  onClick={() => {
                    setConnectedGroup(null)
                    setGroupState(null)
                    setMessage(null)
                    toast.info('已離開群組')
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
              onChange={(event) => setDeviceLabel(event.target.value)}
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
          <input
            className="min-h-11 w-full rounded-xl border border-surface-muted bg-surface px-3"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button
            fullWidth
            disabled={busy || !email.trim()}
            loading={busy}
            onClick={async () => {
              setBusy(true)
              setMessage(null)
              try {
                await signInWithEmail(email)
                setMessage('登入連結已寄出，請到 email 開啟')
                toast.success('登入連結已寄出，請到 email 開啟')
              } catch (caught) {
                const nextMessage = caught instanceof Error ? caught.message : '登入失敗'
                setMessage(nextMessage)
                toast.error(nextMessage)
              } finally {
                setBusy(false)
              }
            }}
          >
            {t('cloud.sendLogin')}
          </Button>
        </div>
      )}

      {message ? <p className="mt-3 text-sm text-text-secondary">{message}</p> : null}
    </section>
  )
}
