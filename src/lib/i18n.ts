import { en } from '@/i18n/en'
import { ja } from '@/i18n/ja'
import { zhHans } from '@/i18n/zh-Hans'
import { zhHant } from '@/i18n/zh-Hant'
import { useAppStore } from '@/stores/appStore'
import type { Language } from '@/types'

const dictionaries = {
  'zh-Hant': zhHant,
  'zh-Hans': zhHans,
  en,
  ja,
}

type TranslationKey = keyof typeof zhHant

export type { TranslationKey }

export const languageLabels: Array<{ value: Language; label: string }> = [
  { value: 'zh-Hant', label: '繁體中文' },
  { value: 'zh-Hans', label: '简体中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
]

export function translate(language: Language, key: TranslationKey): string {
  return dictionaries[language][key] ?? zhHant[key] ?? key
}

export function useI18n() {
  const language = useAppStore((state) => state.settings.language)
  const setLanguage = useAppStore((state) => state.setLanguage)

  return {
    language,
    setLanguage,
    t: (key: TranslationKey) => translate(language, key),
  }
}
