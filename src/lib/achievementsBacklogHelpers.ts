import type { AchievementDefinition, AchievementIconKind } from '@/lib/achievements'
import type { Language } from '@/types'
import type { RemainingCatalogEntry } from '@/data/achievementBacklogRemainingCatalog.generated'
import { getRemainingAchievementDescription } from '@/lib/achievementDescriptions'

const LANGS: Language[] = ['zh-Hant', 'zh-Hans', 'en', 'ja']

const SIMPLIFIED_PAIRS: Array<[string, string]> = [
  ['萬', '万'], ['聖', '圣'], ['誕', '诞'], ['聯', '联'], ['賽', '赛'], ['閏', '闰'],
  ['個', '个'], ['戰', '战'], ['場', '场'], ['記', '记'], ['裡', '里'], ['塢', '坞'],
  ['針', '针'], ['對', '对'], ['紅', '红'], ['藍', '蓝'], ['綠', '绿'], ['質', '质'],
  ['獵', '猎'], ['讀', '读'], ['傳', '传'], ['說', '说'], ['餅', '饼'], ['雙', '双'],
  ['視', '视'], ['勝', '胜'], ['週', '周'], ['歷', '历'], ['與', '与'], ['將', '将'],
  ['組', '组'], ['顯', '显'], ['線', '线'], ['趨', '趋'], ['勢', '势'], ['無', '无'],
  ['點', '点'], ['區', '区'], ['別', '别'], ['圖', '图'], ['專', '专'], ['選', '选'],
  ['擊', '击'], ['層', '层'], ['種', '种'], ['開', '开'], ['關', '关'], ['數', '数'],
  ['總', '总'], ['練', '练'], ['經', '经'], ['驗', '验'], ['達', '达'], ['標', '标'],
  ['進', '进'], ['階', '阶'], ['級', '级'], ['極', '极'], ['獨', '独'], ['歡', '欢'],
  ['廣', '广'], ['譯', '译'], ['體', '体'], ['檔', '档'], ['連', '连'], ['續', '续'],
  ['時', '时'], ['間', '间'], ['後', '后'], ['來', '来'], ['這', '这'], ['個', '个'],
]

function toSimplified(text: string): string {
  let out = text
  for (const [trad, simp] of SIMPLIFIED_PAIRS) {
    out = out.split(trad).join(simp)
  }
  return out
}

function titleRecord(zhHant: string): Record<Language, string> {
  return {
    'zh-Hant': zhHant,
    'zh-Hans': toSimplified(zhHant),
    en: zhHant,
    ja: zhHant,
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
    description: getRemainingAchievementDescription(entry.id, entry.titleZh),
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
