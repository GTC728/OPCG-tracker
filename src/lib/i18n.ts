import { en } from '@/i18n/en'
import { ja } from '@/i18n/ja'
import { zh } from '@/i18n/zh'
import { useAppStore } from '@/stores/appStore'
import type { Language } from '@/types'

const dictionaries = { zh, en, ja }
type TranslationKey = keyof typeof zh

export const languageLabels: Array<{ value: Language; label: string }> = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
]

export function translate(language: Language, key: TranslationKey): string {
  return dictionaries[language][key] ?? zh[key] ?? key
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
