import { Button } from '@/components/ui/Button'
import { MetricHeroCard } from '@/components/ui/MetricHeroCard'
import { APP_VERSION, GITHUB_REPO_URL, LIVE_APP_URL } from '@/lib/constants'
import { useI18n } from '@/lib/i18n'
import { uiGlassCard, uiHeroTitle, uiPageEyebrow, uiSectionTitle } from '@/lib/uiSurface'

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <article className={[uiGlassCard, 'space-y-2 p-4'].join(' ')}>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-text-secondary">{desc}</p>
    </article>
  )
}

export function LandingPage() {
  const { t } = useI18n()

  return (
    <div className="min-h-full bg-surface px-5 py-8">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <header className="space-y-3">
          <p className={uiPageEyebrow}>OPCG Tracker · v{APP_VERSION}</p>
          <h1 className={uiHeroTitle}>{t('landing.title')}</h1>
          <p className="text-sm text-text-secondary">{t('landing.subtitle')}</p>
          <Button fullWidth onClick={() => window.location.assign('/')}>
            {t('landing.openApp')}
          </Button>
        </header>

        <MetricHeroCard
          metrics={[
            { label: t('landing.featureRecord'), value: '⚡' },
            { label: t('landing.featureStats'), value: '📊' },
            { label: t('landing.featureGroup'), value: '👥' },
          ]}
        />

        <section className="space-y-3">
          <h2 className={uiSectionTitle}>{t('landing.featuresTitle')}</h2>
          <FeatureCard title={t('landing.featureRecord')} desc={t('landing.featureRecordDesc')} />
          <FeatureCard title={t('landing.featureStats')} desc={t('landing.featureStatsDesc')} />
          <FeatureCard title={t('landing.featureGroup')} desc={t('landing.featureGroupDesc')} />
          <FeatureCard title={t('landing.featureCloud')} desc={t('landing.featureCloudDesc')} />
        </section>

        <section className={[uiGlassCard, 'space-y-2 p-4'].join(' ')}>
          <h2 className="text-base font-semibold">{t('landing.installTitle')}</h2>
          <p className="text-sm text-text-secondary">{t('landing.installDesc')}</p>
        </section>

        <p className="text-center text-xs text-text-secondary">{t('landing.domainNote')}</p>

        <a
          className="text-center text-sm text-brand-400 underline-offset-2 hover:underline"
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noreferrer"
        >
          {t('landing.github')}
        </a>

        <p className="text-center text-[11px] text-text-secondary">{LIVE_APP_URL}</p>
      </div>
    </div>
  )
}

export function isLandingPath(): boolean {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  return path === '/about' || path === '/welcome' || path === '/docs'
}
