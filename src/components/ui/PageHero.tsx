import { uiHeroTitle, uiPageEyebrow } from '@/lib/uiSurface'

export function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
}) {
  return (
    <header className="space-y-1">
      {eyebrow ? <p className={uiPageEyebrow}>{eyebrow}</p> : null}
      <h2 className={uiHeroTitle}>{title}</h2>
      {subtitle ? <p className="text-sm text-text-secondary">{subtitle}</p> : null}
    </header>
  )
}
