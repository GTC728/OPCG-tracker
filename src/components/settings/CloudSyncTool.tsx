import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  getCloudSession,
  isCloudConfigured,
  loadLatestCloudSnapshot,
  signInWithEmail,
  signOutCloud,
  uploadCloudSnapshot,
} from '@/lib/cloudSync'
import { formatDateTime } from '@/lib/utils'
import { getAppState, useAppStore } from '@/stores/appStore'

function getDefaultDeviceLabel(): string {
  const platform = navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
  return `OPCG ${platform}`
}

export function CloudSyncTool() {
  const replaceState = useAppStore((state) => state.replaceState)
  const [email, setEmail] = useState('')
  const [deviceLabel, setDeviceLabel] = useState(getDefaultDeviceLabel)
  const [userEmail, setUserEmail] = useState<string | null>(null)
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
      setMessage(caught instanceof Error ? caught.message : '讀取雲端狀態失敗')
    }
  }

  useEffect(() => {
    refreshCloudStatus()
  }, [])

  if (!configured) {
    return (
      <section className="rounded-2xl bg-surface-elevated p-4">
        <h2 className="text-lg font-semibold">Cloud Backup</h2>
        <p className="mt-2 text-sm text-text-secondary">
          尚未設定 Supabase。完成 `.env.local` 後，這裡會顯示登入、備份和還原。
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl bg-surface-elevated p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Cloud Backup</h2>
          <p className="mt-1 text-sm text-text-secondary">
            使用 email 登入；先做手動備份 / 還原，自動同步下一步再加。
          </p>
        </div>
        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs text-text-secondary">
          {userEmail ? '已登入' : '未登入'}
        </span>
      </div>

      {userEmail ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-text-secondary">{userEmail}</p>
          {latestBackup ? (
            <p className="text-sm text-text-secondary">最新備份：{formatDateTime(latestBackup)}</p>
          ) : null}
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
              onClick={async () => {
                setBusy(true)
                setMessage(null)
                try {
                  await uploadCloudSnapshot(getAppState(), deviceLabel)
                  setMessage('已備份到雲端')
                  await refreshCloudStatus()
                } catch (caught) {
                  setMessage(caught instanceof Error ? caught.message : '備份失敗')
                } finally {
                  setBusy(false)
                }
              }}
            >
              備份
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
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
                  await refreshCloudStatus()
                } catch (caught) {
                  setMessage(caught instanceof Error ? caught.message : '還原失敗')
                } finally {
                  setBusy(false)
                }
              }}
            >
              還原
            </Button>
          </div>
          <Button
            variant="ghost"
            fullWidth
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await signOutCloud()
                setUserEmail(null)
                setLatestBackup(null)
                setMessage('已登出')
              } catch (caught) {
                setMessage(caught instanceof Error ? caught.message : '登出失敗')
              } finally {
                setBusy(false)
              }
            }}
          >
            登出
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
            onClick={async () => {
              setBusy(true)
              setMessage(null)
              try {
                await signInWithEmail(email)
                setMessage('登入連結已寄出，請到 email 開啟')
              } catch (caught) {
                setMessage(caught instanceof Error ? caught.message : '登入失敗')
              } finally {
                setBusy(false)
              }
            }}
          >
            寄出登入連結
          </Button>
        </div>
      )}

      {message ? <p className="mt-3 text-sm text-text-secondary">{message}</p> : null}
    </section>
  )
}
