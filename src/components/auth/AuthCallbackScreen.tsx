import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { completeAuthFromUrl } from '@/lib/cloudSync'
import { isPwaStandalone } from '@/lib/pwaInstall'
import { useI18n } from '@/lib/i18n'
import { useAppStore } from '@/stores/appStore'

export function AuthCallbackScreen({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const updateSettings = useAppStore((state) => state.updateSettings)
  const [status, setStatus] = useState<'working' | 'ok' | 'error'>('working')
  const [detail, setDetail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void completeAuthFromUrl()
      .then(async ({ email }) => {
        if (cancelled) return
        const { getCloudSession } = await import('@/lib/cloudSync')
        const { user } = await getCloudSession()
        updateSettings({ cloudUserId: user?.id ?? null })
        setDetail(email)
        setStatus('ok')
      })
      .catch((caught) => {
        if (cancelled) return
        setDetail(caught instanceof Error && caught.message !== 'AUTH_CALLBACK_FAILED'
          ? caught.message
          : t('cloud.authCallbackFailed'))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [t, updateSettings])

  return (
    <div className="flex h-full items-center justify-center bg-surface px-5 py-8">
      <section className="w-full max-w-md space-y-4 rounded-3xl bg-surface-elevated p-6 ring-1 ring-surface-muted">
        <h1 className="text-2xl font-bold">{t('cloud.authCallbackTitle')}</h1>
        {status === 'working' ? <p className="text-sm text-text-secondary">{t('app.loading')}</p> : null}
        {status === 'ok' ? (
          <>
            <p className="text-sm text-text-secondary">{t('cloud.authCallbackOk')}</p>
            {detail ? <p className="text-sm font-medium">{detail}</p> : null}
            <p className="text-xs text-text-secondary">{t('cloud.authCallbackHint')}</p>
            <Button fullWidth onClick={onDone}>
              {isPwaStandalone() ? t('cloud.authCallbackContinue') : t('cloud.authCallbackOpenApp')}
            </Button>
          </>
        ) : null}
        {status === 'error' ? (
          <>
            <p className="text-sm text-danger">{detail ?? t('cloud.authCallbackFailed')}</p>
            <p className="text-xs text-text-secondary">{t('cloud.authCallbackHint')}</p>
            <Button fullWidth onClick={onDone}>
              {t('cloud.authCallbackContinue')}
            </Button>
          </>
        ) : null}
      </section>
    </div>
  )
}
