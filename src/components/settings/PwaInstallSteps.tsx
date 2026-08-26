import { useI18n } from '@/lib/i18n'

export function PwaInstallSteps() {
  const { t } = useI18n()

  return (
    <div className="space-y-3 text-xs leading-relaxed text-text-secondary">
      <div className="rounded-lg bg-surface p-3">
        <p className="font-semibold text-text-primary">{t('pwa.install.androidTitle')}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>{t('pwa.install.androidStep1')}</li>
          <li>{t('pwa.install.androidStep2')}</li>
          <li>{t('pwa.install.androidStep3')}</li>
        </ol>
      </div>
      <div className="rounded-lg bg-surface p-3">
        <p className="font-semibold text-text-primary">{t('pwa.install.iosTitle')}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>{t('pwa.install.iosStep1')}</li>
          <li>{t('pwa.install.iosStep2')}</li>
          <li>{t('pwa.install.iosStep3')}</li>
          <li>{t('pwa.install.iosStep4')}</li>
        </ol>
      </div>
    </div>
  )
}
