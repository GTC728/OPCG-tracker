import { useI18n } from '@/lib/i18n'
import { uiCard, uiPageEyebrow } from '@/lib/uiSurface'

function StepList({ title, steps }: { title: string; steps: string[] }) {
  return (
    <section className="space-y-2">
      <p className={[uiPageEyebrow, 'px-1'].join(' ')}>{title}</p>
      <ol className={uiCard}>
        {steps.map((step, index) => (
          <li
            key={step}
            className={[
              'flex gap-3 px-4 py-3.5',
              index > 0 ? 'border-t border-[var(--ui-border)]' : '',
            ].join(' ')}
          >
            <span className="w-5 shrink-0 text-sm font-semibold tabular-nums text-text-secondary">
              {index + 1}
            </span>
            <p className="text-sm leading-relaxed text-text-primary">{step}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function PwaInstallSteps() {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <StepList
        title={t('pwa.install.androidTitle')}
        steps={[t('pwa.install.androidStep1'), t('pwa.install.androidStep2'), t('pwa.install.androidStep3')]}
      />
      <StepList
        title={t('pwa.install.iosTitle')}
        steps={[
          t('pwa.install.iosStep1'),
          t('pwa.install.iosStep2'),
          t('pwa.install.iosStep3'),
          t('pwa.install.iosStep4'),
        ]}
      />
    </div>
  )
}
