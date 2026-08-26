import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PwaInstallSteps } from '@/components/settings/PwaInstallSteps'
import { useToast } from '@/components/ui/Toast'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { useI18n } from '@/lib/i18n'

export function PwaInstallPanel({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()
  const toast = useToast()
  const { standalone, canPrompt, install } = usePwaInstall()
  const [busy, setBusy] = useState(false)

  if (standalone) {
    if (compact) return null
    return (
      <section className="rounded-xl bg-surface-elevated p-4 ring-1 ring-surface-muted">
        <h3 className="text-sm font-semibold">{t('pwa.install.title')}</h3>
        <p className="mt-2 text-sm text-text-secondary">{t('pwa.install.installed')}</p>
      </section>
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
    <section
      className={
        compact
          ? 'rounded-xl bg-brand-500/10 p-4 ring-1 ring-brand-500/25'
          : 'space-y-3 rounded-xl bg-surface-elevated p-4 ring-1 ring-surface-muted'
      }
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-400">{t('pwa.install.recommend')}</p>
        <h3 className="mt-1 text-sm font-semibold">{t('pwa.install.title')}</h3>
        <p className="mt-1 text-sm text-text-secondary">{t('pwa.install.desc')}</p>
      </div>

      <Button fullWidth loading={busy} disabled={busy} onClick={() => void handleInstall()}>
        {canPrompt ? t('pwa.install.button') : t('pwa.install.showSteps')}
      </Button>

      {canPrompt ? (
        <p className="text-xs text-text-secondary">{t('pwa.install.promptReady')}</p>
      ) : (
        <p className="text-xs text-text-secondary">{t('pwa.install.unavailable')}</p>
      )}

      <PwaInstallSteps />
    </section>
  )
}
