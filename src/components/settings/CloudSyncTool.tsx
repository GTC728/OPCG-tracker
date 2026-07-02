import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  getSharedCloudState,
  isCloudConfigured,
  maskPin,
  type SharedCloudState,
  uploadSharedCloudState,
} from '@/lib/cloudSync'
import { formatDateTime } from '@/lib/utils'
import { getAppState, useAppStore } from '@/stores/appStore'

function getDefaultDeviceLabel(): string {
  const platform = navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
  return `OPCG ${platform}`
}

export function CloudSyncTool() {
  const replaceState = useAppStore((state) => state.replaceState)
  const [pin, setPin] = useState('')
  const [connectedPin, setConnectedPin] = useState<string | null>(null)
  const [deviceLabel, setDeviceLabel] = useState(getDefaultDeviceLabel)
  const [cloudState, setCloudState] = useState<SharedCloudState | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const configured = isCloudConfigured()

  async function refreshCloudStatus() {
    if (!configured || !connectedPin) return
    try {
      setCloudState(await getSharedCloudState(connectedPin))
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : '讀取雲端狀態失敗')
    }
  }

  useEffect(() => {
    const savedPin = sessionStorage.getItem('opcg-shared-pin')
    if (savedPin && !connectedPin) {
      setConnectedPin(savedPin)
      return
    }
    refreshCloudStatus()
  }, [connectedPin])

  if (!configured) {
    return (
      <section className="rounded-2xl bg-surface-elevated p-4">
        <h2 className="text-lg font-semibold">Cloud Backup</h2>
        <p className="mt-2 text-sm text-text-secondary">
          尚未設定 Supabase。完成 `.env.local` 後，這裡會顯示 PIN 群組同步。
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
            用同一組 PIN 共用一份資料；先做手動上傳 / 下載。
          </p>
        </div>
        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs text-text-secondary">
          {connectedPin ? '已連接' : '未連接'}
        </span>
      </div>

      {connectedPin ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-text-secondary">PIN：{maskPin(connectedPin)}</p>
          {cloudState ? (
            <p className="text-sm text-text-secondary">
              雲端更新：{formatDateTime(cloudState.updated_at)} · {cloudState.device_label}
            </p>
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
                  await uploadSharedCloudState(connectedPin, getAppState(), deviceLabel)
                  setMessage('已上傳到共享資料')
                  await refreshCloudStatus()
                } catch (caught) {
                  setMessage(caught instanceof Error ? caught.message : '上傳失敗')
                } finally {
                  setBusy(false)
                }
              }}
            >
              上傳
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={async () => {
                const confirmed = window.confirm('會用共享資料覆蓋本機資料，確定下載？')
                if (!confirmed) return
                setBusy(true)
                setMessage(null)
                try {
                  const latest = await getSharedCloudState(connectedPin)
                  if (!latest) throw new Error('這組 PIN 還沒有共享資料')
                  replaceState(latest.state)
                  setCloudState(latest)
                  setMessage('已下載共享資料')
                } catch (caught) {
                  setMessage(caught instanceof Error ? caught.message : '下載失敗')
                } finally {
                  setBusy(false)
                }
              }}
            >
              下載
            </Button>
          </div>
          <Button
            variant="ghost"
            fullWidth
            disabled={busy}
            onClick={() => {
              setConnectedPin(null)
              sessionStorage.removeItem('opcg-shared-pin')
              setCloudState(null)
              setMessage(null)
            }}
          >
            離開 PIN
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <input
            className="min-h-11 w-full rounded-xl border border-surface-muted bg-surface px-3"
            placeholder="輸入共享 PIN"
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
          />
          <Button
            fullWidth
            disabled={busy || pin.trim().length < 4}
            onClick={async () => {
              setBusy(true)
              setMessage(null)
              try {
                const currentPin = pin.trim()
                const latest = await getSharedCloudState(currentPin)
                sessionStorage.setItem('opcg-shared-pin', currentPin)
                setConnectedPin(currentPin)
                setCloudState(latest)
                setMessage(latest ? '已連接共享資料' : '新的 PIN，先上傳本機資料即可建立')
              } catch (caught) {
                setMessage(caught instanceof Error ? caught.message : '連接失敗')
              } finally {
                setBusy(false)
              }
            }}
          >
            連接 PIN
          </Button>
        </div>
      )}

      {message ? <p className="mt-3 text-sm text-text-secondary">{message}</p> : null}
    </section>
  )
}
