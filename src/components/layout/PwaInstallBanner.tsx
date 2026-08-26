import { useState, type MouseEvent } from 'react'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { dismissPwaInstallNudge, requestOpenPwaInstallPage, shouldShowPwaInstallNudge } from '@/lib/pwaInstall'
import { useI18n } from '@/lib/i18n'

export function PwaInstallBanner({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { t } = useI18n()
  const { standalone } = usePwaInstall()
  const [visible, setVisible] = useState(() => shouldShowPwaInstallNudge())

  if (standalone || !visible) return null

  const handleDismiss = (event: MouseEvent) => {
    event.stopPropagation()
    dismissPwaInstallNudge()
    setVisible(false)
  }

  const handleOpen = () => {
    onOpenSettings()
    requestOpenPwaInstallPage()
  }

  return (
    <div className="flex min-h-8 w-full items-center border-b border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning-fg)]">
      <button
        type="button"
        className="min-w-0 flex-1 truncate px-3 py-1.5 text-left text-[11px] font-medium"
        onClick={handleOpen}
      >
        {t('pwa.banner.title')}
        <span className="font-normal opacity-80"> · {t('pwa.banner.body')}</span>
      </button>
      <button
        type="button"
        className="flex h-8 w-8 shrink-0 items-center justify-center text-base leading-none"
        aria-label={t('pwa.banner.dismiss')}
        onClick={handleDismiss}
      >
        ×
      </button>
    </div>
  )
}
