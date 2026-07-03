import { LEADER_LOCALE_ALIASES } from '@/data/leaderLocaleAliases'
import type { Deck, Language } from '@/types'

/** Primary display names per language (canonical English leaderName as key). */
export const LEADER_DISPLAY_NAMES: Record<string, Partial<Record<Language, string>>> = {
  'Portgas.D.Ace': { zh: '艾斯', ja: 'エース' },
  'Boa Hancock': { zh: '女帝', ja: 'ハンコック' },
  'Brook': { zh: '布魯克', ja: 'ブルック' },
  'Crocodile': { zh: '沙鱷魚', ja: 'クロコダイル' },
  'Marshall.D.Teach': { zh: '黑鬍子', ja: 'テーチ' },
  'Monkey.D.Luffy': { zh: '路飛', ja: 'ルフィ' },
  'Roronoa Zoro': { zh: '索隆', ja: 'ゾロ' },
  'Nami': { zh: '娜美', ja: 'ナミ' },
  'Sanji': { zh: '山治', ja: 'サンジ' },
  'Nico Robin': { zh: '羅賓', ja: 'ロビン' },
  'Yamato': { zh: '大和', ja: 'ヤマト' },
  'Kouzuki Oden': { zh: '御田', ja: 'おでん' },
  'Shanks': { zh: '香克斯', ja: 'シャンクス' },
  'Edward.Newgate': { zh: '白鬍子', ja: '白ひげ' },
  'Charlotte Katakuri': { zh: '卡塔庫栗', ja: 'カタクリ' },
  'Donquixote Doflamingo': { zh: '多弗朗明哥', ja: 'ドフラミンゴ' },
  'Trafalgar Law': { zh: '羅', ja: 'ロー' },
  'Eustass Kid': { zh: '基德', ja: 'キッド' },
  'Kaido': { zh: '凱多', ja: 'カイドウ' },
  'Big Mom': { zh: 'Big Mom', ja: 'ビッグ・マム' },
  'Sakazuki': { zh: '赤犬', ja: 'サカズキ' },
  'Borsalino': { zh: '黃猿', ja: 'ボルサリーノ' },
  'Kuzan': { zh: '青雉', ja: 'クザン' },
  'Dracule Mihawk': { zh: '鷹眼', ja: 'ミホーク' },
  'Jinbe': { zh: '甚平', ja: 'ジンベエ' },
  'Sabo': { zh: '薩博', ja: 'サボ' },
  'Gol.D.Roger': { zh: '羅傑', ja: 'ロジャー' },
  'Hannyabal': { zh: '漢尼拔', ja: 'ハンニャバル' },
  'Enel': { zh: '艾尼路', ja: 'エネル' },
  'Uta': { zh: '烏塔', ja: 'ウタ' },
  'Reiju': { zh: '麗久', ja: 'レイジュ' },
  'Marco': { zh: '馬爾科', ja: 'マルコ' },
  'King': { zh: '烬', ja: 'キング' },
  'Queen': { zh: '奎因', ja: 'クイーン' },
  'Buggy': { zh: '巴基', ja: 'バギー' },
  'Smoker': { zh: '斯摩格', ja: 'スモーカー' },
  'Rob Lucci': { zh: '路奇', ja: 'ルッチ' },
  'Corazon': { zh: '柯拉松', ja: 'コラソン' },
  'Carrot': { zh: '加洛特', ja: 'キャロット' },
  'Perona': { zh: '佩羅娜', ja: 'ペローナ' },
  'Rebecca': { zh: '蕾貝卡', ja: 'レベッカ' },
  'Shirahoshi': { zh: '白星', ja: 'しらほし' },
}

function pickChineseAlias(aliases: string[]): string | undefined {
  return aliases.find((alias) => /[\u4e00-\u9fff]/.test(alias))
}

function pickJapaneseAlias(aliases: string[]): string | undefined {
  return aliases.find((alias) => /[\u3040-\u309f\u30a0-\u30ff]/.test(alias))
}

export function getLeaderDisplayName(leaderName: string, language: Language): string {
  const explicit = LEADER_DISPLAY_NAMES[leaderName]?.[language]
  if (explicit) return explicit
  if (language === 'en') return leaderName

  const aliases = LEADER_LOCALE_ALIASES[leaderName] ?? []
  if (language === 'zh') {
    return pickChineseAlias(aliases) ?? leaderName
  }
  if (language === 'ja') {
    return pickJapaneseAlias(aliases) ?? leaderName
  }

  return leaderName
}

export function getDeckDisplayName(deck: Deck, language: Language): string {
  const leaderLabel = getLeaderDisplayName(deck.leaderName, language)
  return [deck.setCode, leaderLabel].filter(Boolean).join(' ')
}
