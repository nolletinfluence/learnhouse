'use client'

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import ru from '../locales/ru.json';
import schoolEn from '../locales/school.en.json';
import schoolRu from '../locales/school.ru.json';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, normalizeLocale, detectLocalePreference } from './locale';
export { normalizeLocale } from './locale';
import { loadDateLocale } from './format';
import { applyDocumentDirection } from './direction';

const resources = { en: { common: en, school: schoolEn }, ru: { common: ru, school: schoolRu } }
const USER_PICKED_KEY = 'i18nextLng_userPicked'

export { detectLocalePreference, type LocalePreference, type LocalePreferenceSource } from './locale'

export function detectPreferredLocale(): string {
  return detectLocalePreference().locale
}

export function hasExplicitLocalePreference(): boolean {
  return detectLocalePreference().source !== 'default'
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: DEFAULT_LOCALE,
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LOCALES],
    ns: ['common', 'school'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    }
  });

export async function prepareLocale(language: string): Promise<boolean> {
  const locale = normalizeLocale(language)
  await loadDateLocale(locale)
  applyDocumentDirection(locale)
  return true
}

function persistCookie(language: string): void {
  try {
    document.cookie = `i18next=${encodeURIComponent(language)}; path=/; max-age=31536000; samesite=lax`
  } catch { return }
}

function persistLocale(language: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem('i18nextLng', language)
  } catch {
    persistCookie(language)
    return
  }

  persistCookie(language)
}

function markExplicitPreference(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(USER_PICKED_KEY, '1')
  } catch {
    return
  }
}

export async function changeLanguage(
  language: string,
  source: 'user' | 'preference' | 'default' | 'organization' = 'user',
): Promise<boolean> {
  const locale = normalizeLocale(language)
  if (!await prepareLocale(locale)) return false
  await i18n.changeLanguage(locale)
  if (source === 'user' || source === 'preference') {
    persistLocale(locale)
    markExplicitPreference()
  }
  return true
}

export async function initializeLanguage(): Promise<boolean> {
  const preference = detectLocalePreference()
  return changeLanguage(
    preference.locale,
    preference.source === 'default' ? 'default' : 'preference',
  )
}

export async function syncOrganizationLanguage(language: string): Promise<boolean> {
  if (hasExplicitLocalePreference()) return false
  const locale = normalizeLocale(language)
  if (i18n.language.split('-')[0] === locale) return false
  return changeLanguage(locale, 'organization')
}

export default i18n;
