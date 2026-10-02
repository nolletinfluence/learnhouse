export type Locale = 'ru' | 'en'

export const SUPPORTED_LOCALES: readonly Locale[] = ['ru', 'en']

export function supportedLocale(value: unknown): Locale | undefined {
  if (typeof value !== 'string') return undefined
  const code = value.trim().toLowerCase().replace(/_/g, '-').split('-')[0]
  return code === 'ru' || code === 'en' ? code : undefined
}

export const DEFAULT_LOCALE = supportedLocale(process.env.NEXT_PUBLIC_LEARNHOUSE_DEFAULT_LOCALE) ?? 'ru'

export function normalizeLocale(value: unknown): Locale {
  return supportedLocale(value) ?? DEFAULT_LOCALE
}

export type LocalePreferenceSource = 'stored' | 'cookie' | 'query' | 'default'
export type LocalePreference = { locale: Locale; source: LocalePreferenceSource }

function storedLocale(): Locale | undefined {
  try { return supportedLocale(window.localStorage.getItem('i18nextLng')) }
  catch { return undefined }
}

function cookieLocale(): Locale | undefined {
  try {
    const cookie = document.cookie.match(/(?:^|;\s*)i18next=([^;]*)/)
    return cookie ? supportedLocale(decodeURIComponent(cookie[1])) : undefined
  } catch { return undefined }
}

export function detectLocalePreference(): LocalePreference {
  if (typeof window === 'undefined') return { locale: DEFAULT_LOCALE, source: 'default' }
  const stored = storedLocale()
  if (stored) return { locale: stored, source: 'stored' }
  const cookie = cookieLocale()
  if (cookie) return { locale: cookie, source: 'cookie' }
  const query = supportedLocale(new URLSearchParams(window.location.search).get('lng'))
  return query ? { locale: query, source: 'query' } : { locale: DEFAULT_LOCALE, source: 'default' }
}
