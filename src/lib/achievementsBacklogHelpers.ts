import type { AchievementDefinition, AchievementIconKind } from '@/lib/achievements'
import type { Language } from '@/types'
import type { RemainingCatalogEntry } from '@/data/achievementBacklogRemainingCatalog.generated'

const LANGS: Language[] = ['zh-Hant', 'zh-Hans', 'en', 'ja']

function titleRecord(zh: string): Record<Language, string> {
  return {
    'zh-Hant': zh,
    'zh-Hans': zh.replace(/賽/g, '赛').replace(/組/g, '组').replace(/將/g, '将'),
    en: zh,
    ja: zh,
  }
}

function tierLabel(threshold: number, suffix: string): Record<Language, string> {
  const label = `${threshold}${suffix}`
  const out = {} as Record<Language, string>
  for (const lang of LANGS) out[lang] = label
  return out
}

function defaultSuffix(id: string): string {
  if (id.includes('win') || id.includes('victory') || id.includes('mastery') || id.includes('rush')) return ' 勝'
  if (id.includes('day') || id.includes('regular') || id.includes('sign')) return ' 天'
  if (id.includes('percent') || id.includes('rate') || id.includes('wr')) return '%'
  if (id.startsWith('secret_')) return ''
  return ''
}

export function buildRemainingAchievementDefinition(entry: RemainingCatalogEntry): AchievementDefinition {
  const suffix = defaultSuffix(entry.id)
  return {
    id: entry.id,
    category: entry.category,
    kind: entry.kind,
    ease: entry.ease,
    icon: entry.icon as AchievementIconKind,
    title: titleRecord(entry.titleZh),
    description: {
      'zh-Hant': `${entry.titleZh} — 累積進度成就。`,
      'zh-Hans': `${entry.titleZh} — 累积进度成就。`,
      en: `${entry.titleZh} — cumulative progress.`,
      ja: `${entry.titleZh} — 累積達成。`,
    },
    tiers: entry.tiers.map((threshold, index) => ({
      level: index + 1,
      threshold,
      label: tierLabel(threshold, suffix || (threshold === 1 ? '' : '')),
    })),
  }
}

export function buildRemainingAchievementDefinitions(catalog: RemainingCatalogEntry[]): AchievementDefinition[] {
  return catalog.map(buildRemainingAchievementDefinition)
}
