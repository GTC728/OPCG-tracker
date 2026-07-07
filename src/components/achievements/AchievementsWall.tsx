import { getAchievementDefinition } from '@/lib/achievements'
import { useI18n } from '@/lib/i18n'
import { uiGlassCard, uiSectionTitle } from '@/lib/uiSurface'
import type { AchievementDefinition } from '@/lib/achievements'
import type { Language } from '@/types'

const rarityRing: Record<AchievementDefinition['rarity'], string> = {
  common: 'ring-white/[0.08]',
  rare: 'ring-brand-500/30',
  legendary: 'ring-amber-400/40',
}

export function AchievementsWall({
  achievements,
}: {
  achievements: Array<AchievementDefinition & { unlockedAt: string | null }>
}) {
  const { language, t } = useI18n()
  const unlockedCount = achievements.filter((item) => item.unlockedAt).length

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className={uiSectionTitle}>{t('achievements.title')}</h2>
        <span className="rounded-md bg-surface-muted/40 px-2 py-1 text-xs text-text-secondary">
          {unlockedCount}/{achievements.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {achievements.map((achievement) => {
          const unlocked = Boolean(achievement.unlockedAt)
          return (
            <article
              key={achievement.id}
              className={[
                uiGlassCard,
                'p-3 transition',
                unlocked ? '' : 'opacity-45 grayscale',
                rarityRing[achievement.rarity],
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl" aria-hidden>
                  {achievement.icon}
                </span>
                {unlocked ? (
                  <span className="rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                    ✓
                  </span>
                ) : null}
              </div>
              <h3 className="mt-2 text-sm font-semibold">{achievement.title[language as Language]}</h3>
              <p className="mt-1 text-[11px] leading-snug text-text-secondary">
                {achievement.description[language as Language]}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export function formatAchievementToast(achievementId: string, language: Language): string {
  const definition = getAchievementDefinition(achievementId)
  if (!definition) return achievementId
  return `${definition.icon} ${definition.title[language]}`
}
