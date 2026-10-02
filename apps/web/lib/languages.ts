import type { Direction } from './direction'
import { normalizeLocale } from './locale'

export interface Language {
  code: string
  translationKey: string
  nativeName: string
  dir: Direction
}

export const AVAILABLE_LANGUAGES: Language[] = [
  { code: 'ru', translationKey: 'common.russian', nativeName: 'Русский', dir: 'ltr' },
  { code: 'en', translationKey: 'common.english', nativeName: 'English', dir: 'ltr' },
]

export const getLanguageByCode = (code: string): Language | undefined =>
  AVAILABLE_LANGUAGES.find(language => language.code === normalizeLocale(code))

export const getCurrentLanguageNativeName = (code: string): string =>
  getLanguageByCode(code)?.nativeName ?? 'Русский'
