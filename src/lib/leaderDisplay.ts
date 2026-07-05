import { LEADER_LOCALE_NAMES } from '@/data/leaderLocaleNames'
import { LEADER_LOCALE_ALIASES } from '@/data/leaderLocaleAliases'
import type { Deck, Language } from '@/types'

function pickChineseAlias(aliases: string[], script: 'Hant' | 'Hans'): string | undefined {
  const traditional = aliases.find((alias) => /[\u4e00-\u9fff]/.test(alias) && /[國學會這裡說對時為與]/u.test(alias))
  const simplified = aliases.find((alias) => /[\u4e00-\u9fff]/.test(alias) && /[国会学说这里时为与]/u.test(alias))
  const anyChinese = aliases.find((alias) => /[\u4e00-\u9fff]/.test(alias))
  if (script === 'Hans') return simplified ?? anyChinese
  return traditional ?? anyChinese
}

function pickJapaneseAlias(aliases: string[]): string | undefined {
  return aliases.find((alias) => /[\u3040-\u309f\u30a0-\u30ff]/.test(alias))
}

function withManualMarker(label: string, manual?: boolean): string {
  return manual ? `${label}*` : label
}

export function getLeaderDisplayName(leaderName: string, language: Language): string {
  const locale = LEADER_LOCALE_NAMES[leaderName]
  if (locale) {
    if (language === 'en') return leaderName
    if (language === 'zh-Hant') return withManualMarker(locale['zh-Hant'], locale.manual)
    if (language === 'zh-Hans') return withManualMarker(locale['zh-Hans'], locale.manual)
    if (language === 'ja') return withManualMarker(locale.ja, locale.manual)
  }

  if (language === 'en') return leaderName

  const aliases = LEADER_LOCALE_ALIASES[leaderName] ?? []
  if (language === 'zh-Hant' || language === 'zh-Hans') {
    const script = language === 'zh-Hans' ? 'Hans' : 'Hant'
    const alias = pickChineseAlias(aliases, script)
    return alias ? `${alias}*` : leaderName
  }
  if (language === 'ja') {
    const alias = pickJapaneseAlias(aliases)
    return alias ? `${alias}*` : leaderName
  }

  return leaderName
}

export function getDeckDisplayName(deck: Deck, language: Language): string {
  const leaderLabel = getLeaderDisplayName(deck.leaderName, language)
  return [deck.setCode, leaderLabel].filter(Boolean).join(' ')
}
