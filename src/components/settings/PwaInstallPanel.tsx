import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PageHero } from '@/components/ui/PageHero'
import { PwaInstallSteps } from '@/components/settings/PwaInstallSteps'
import { useToast } from '@/components/ui/Toast'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { useI18n } from '@/lib/i18n'

export function PwaInstallPanel() {
  const { t } = useI18n()
  const toast = useToast()
  const { standalone, canPrompt, install } = usePwaInstall()
  const [busy, setBusy] = useState(false)

  if (standalone) {
    return (
      <div className="space-y-4">
        <PageHero title={t('pwa.install.title')} subtitle={t('pwa.install.installed')} />
      </div>
    )
  }

  const handleInstall = async () => {
    setBusy(true)
    try {
      const outcome = await install()
      if (outcome === 'accepted') {
        toast.success(t('pwa.install.accepted'))
        return
      }
      if (outcome === 'dismissed') {
        toast.info(t('pwa.install.dismissed'))
        return
      }
      toast.info(t('pwa.install.unavailable'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero title={t('pwa.install.title')} subtitle={t('pwa.install.desc')} />

      {canPrompt ? (
        <div className="space-y-2">
          <Button fullWidth loading={busy} disabled={busy} onClick={() => void handleInstall()}>
            {t('pwa.install.button')}
          </Button>
          <p className="text-xs leading-relaxed text-text-secondary">{t('pwa.install.promptReady')}</p>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-text-secondary">{t('pwa.install.unavailable')}</p>
      )}

      <PwaInstallSteps />
    </div>
  )
}
