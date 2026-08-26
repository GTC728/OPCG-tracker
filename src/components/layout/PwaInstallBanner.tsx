import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { dismissPwaInstallNudge, shouldShowPwaInstallNudge } from '@/lib/pwaInstall'
import { useI18n } from '@/lib/i18n'

export function PwaInstallBanner({
  hidden,
  onOpenGuide,
}: {
  hidden?: boolean
  onOpenGuide?: () => void
}) {
  const { t } = useI18n()
  const toast = useToast()
  const { standalone, canPrompt, install } = usePwaInstall()
  const [visible, setVisible] = useState(() => shouldShowPwaInstallNudge())
  const [busy, setBusy] = useState(false)

  if (hidden || standalone || !visible) return null

  const handleDismiss = () => {
    dismissPwaInstallNudge()
    setVisible(false)
  }

  const handleInstall = async () => {
    if (!canPrompt) {
      onOpenGuide?.()
      return
    }
    setBusy(true)
    try {
      const outcome = await install()
      if (outcome === 'accepted') {
        toast.success(t('pwa.install.accepted'))
        handleDismiss()
        return
      }
      if (outcome === 'dismissed') {
        toast.info(t('pwa.install.dismissed'))
        return
      }
      onOpenGuide?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="mb-1 rounded-xl bg-brand-500/12 px-3 py-2 ring-1 ring-brand-500/25">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-text-primary">{t('pwa.banner.title')}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">{t('pwa.banner.body')}</p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg px-2 py-1 text-xs text-text-secondary"
          aria-label={t('pwa.banner.dismiss')}
          onClick={handleDismiss}
        >
          ×
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <Button
          className="min-h-8 flex-1 py-1 text-xs"
          loading={busy}
          disabled={busy}
          onClick={() => void handleInstall()}
        >
          {canPrompt ? t('pwa.banner.install') : t('pwa.banner.how')}
        </Button>
        <Button variant="ghost" className="min-h-8 px-3 py-1 text-xs" onClick={handleDismiss}>
          {t('pwa.banner.later')}
        </Button>
      </div>
    </aside>
  )
}
