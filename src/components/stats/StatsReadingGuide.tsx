import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { uiCard } from '@/lib/uiSurface'

export function StatsReadingGuide() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  const items: Array<{ title: import('@/lib/i18n').TranslationKey; body: import('@/lib/i18n').TranslationKey }> = [
    { title: 'stats.guide.pilotTitle', body: 'stats.guide.pilotBody' },
    { title: 'stats.guide.playerTitle', body: 'stats.guide.playerBody' },
    { title: 'stats.guide.deckTitle', body: 'stats.guide.deckBody' },
    { title: 'stats.guide.matchupTitle', body: 'stats.guide.matchupBody' },
    { title: 'stats.guide.metaTitle', body: 'stats.guide.metaBody' },
    { title: 'stats.guide.weeklyTitle', body: 'stats.guide.weeklyBody' },
  ]

  return (
    <section className={[uiCard, 'p-3'].join(' ')}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left outline-none"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-brand-400">{t('stats.guide.title')}</span>
        <span className="text-xs text-text-secondary">{open ? '▲' : '▼'}</span>
      </button>
      {open ? (
        <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-text-secondary">
          {items.map((item) => (
            <li key={item.title}>
              <p className="font-semibold text-text-primary">{t(item.title)}</p>
              <p className="mt-0.5">{t(item.body)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-text-secondary">{t('stats.guide.summary')}</p>
      )}
    </section>
  )
}
