import type { AchievementIconKind } from '@/lib/achievements'
import { resolveAchievementLucideIcon } from '@/lib/achievementLucideIcons.generated'

const sizeMap = { sm: 16, md: 20, lg: 26 } as const

const toneClass: Record<string, string> = {
  milestone: 'text-brand-400',
  streak: 'text-orange-400',
  meta: 'text-emerald-400',
  social: 'text-violet-400',
  fun: 'text-amber-300',
  skill: 'text-cyan-400',
}

export function AchievementIcon({
  achievementId,
  kind,
  category = 'milestone',
  size = 'md',
  dimmed = false,
}: {
  achievementId?: string
  kind?: AchievementIconKind
  category?: string
  size?: keyof typeof sizeMap
  dimmed?: boolean
}) {
  const px = sizeMap[size]
  const Icon = resolveAchievementLucideIcon(achievementId ?? '', kind, category)

  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-lg bg-surface/50 ring-1 ring-white/[0.08]',
        toneClass[category] ?? 'text-brand-400',
        dimmed ? 'opacity-40 grayscale' : '',
      ].join(' ')}
      style={{ width: px + 10, height: px + 10 }}
      aria-hidden
    >
      <Icon size={px} strokeWidth={2} aria-hidden />
    </span>
  )
}
