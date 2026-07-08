import { getTierMetalStyle } from '@/lib/achievementTierStyles'

/** Segmented tier progress — each segment = one tier level with metal color when earned. */
export function AchievementTierBar({
  currentLevel,
  maxLevel,
  size = 'md',
}: {
  currentLevel: number
  maxLevel: number
  size?: 'sm' | 'md'
}) {
  const height = size === 'sm' ? 'h-1.5' : 'h-2'
  const gap = size === 'sm' ? 'gap-0.5' : 'gap-1'

  return (
    <div className={['flex w-full', gap, height].join(' ')} aria-hidden>
      {Array.from({ length: maxLevel }, (_, index) => {
        const tierLevel = index + 1
        const earned = currentLevel >= tierLevel
        const metal = getTierMetalStyle(tierLevel, maxLevel)
        return (
          <div
            key={tierLevel}
            className={[
              'min-w-0 flex-1 overflow-hidden rounded-sm ring-1 transition-all',
              earned ? 'opacity-100' : 'opacity-35',
            ].join(' ')}
            style={{
              background: earned ? metal.fill : 'color-mix(in srgb, var(--color-surface-muted) 70%, transparent)',
              boxShadow: earned ? `0 0 6px ${metal.glow}` : undefined,
              borderColor: earned ? metal.border : 'var(--ui-border)',
            }}
            title={`Lv.${tierLevel}`}
          />
        )
      })}
    </div>
  )
}
