import type { ReactNode } from 'react'
import { playInteractionSound, uiPressable } from '@/lib/motion'
import { useI18n } from '@/lib/i18n'
import { uiLink, uiSectionTitle } from '@/lib/uiSurface'

/** Unified profile block: title row + optional meta + horizontal content rail. */
export function ProfileSection({
  title,
  meta,
  onViewAll,
  children,
}: {
  title: string
  meta?: string
  onViewAll?: () => void
  children: ReactNode
}) {
  const { t } = useI18n()

  return (
    <section className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className={uiSectionTitle}>{title}</h2>
          {meta ? <p className="mt-0.5 text-xs text-text-secondary">{meta}</p> : null}
        </div>
        {onViewAll ? (
          <button
            type="button"
            className={['shrink-0 pt-0.5 text-xs font-semibold', uiLink, uiPressable].join(' ')}
            onClick={() => {
              playInteractionSound('tap')
              onViewAll()
            }}
          >
            {t('achievements.viewAll')} ›
          </button>
        ) : null}
      </div>
      {children}
    </section>
  )
}
