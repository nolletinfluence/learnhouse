import { detectLocalePreference, normalizeLocale } from './locale'

export type Direction = 'ltr' | 'rtl'

export const RTL_LANGUAGES = new Set([
  'ar',
  'fa',
  'he',
  'iw',
  'ur',
  'ps',
  'sd',
  'ug',
  'yi',
  'dv',
  'ckb',
])

export function baseCode(lng?: string | null): string {
  return String(lng || 'en').split('-')[0].toLowerCase()
}

export function directionForLanguage(lng?: string | null): Direction {
  return RTL_LANGUAGES.has(baseCode(lng)) ? 'rtl' : 'ltr'
}

export function dirMultiplier(dir: Direction): 1 | -1 {
  return dir === 'rtl' ? -1 : 1
}

export function detectClientLanguage(): string {
  return detectLocalePreference().locale
}

export function applyDocumentDirection(lng: string): Direction {
  const code = normalizeLocale(lng)
  const dir = directionForLanguage(code)

  if (typeof document === 'undefined') return dir

  const el = document.documentElement
  el.setAttribute('lang', code)
  el.setAttribute('dir', dir)
  el.style.setProperty('--dir', dir === 'rtl' ? '-1' : '1')

  return dir
}
