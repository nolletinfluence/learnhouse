'use client'

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import { loadDateLocale } from './format';
import { applyDocumentDirection } from './direction';

const LOCALE_LOADERS: Record<string, () => Promise<{ default: any }>> = {
  fr: () => import('../locales/fr.json'),
  de: () => import('../locales/de.json'),
  es: () => import('../locales/es.json'),
  ar: () => import('../locales/ar.json'),
  ja: () => import('../locales/ja.json'),
  pt: () => import('../locales/pt.json'),
  ru: () => import('../locales/ru.json'),
  zh: () => import('../locales/zh.json'),
  hi: () => import('../locales/hi.json'),
  ko: () => import('../locales/ko.json'),
  it: () => import('../locales/it.json'),
  tr: () => import('../locales/tr.json'),
  vi: () => import('../locales/vi.json'),
  id: () => import('../locales/id.json'),
  pl: () => import('../locales/pl.json'),
  uk: () => import('../locales/uk.json'),
  nl: () => import('../locales/nl.json'),
  th: () => import('../locales/th.json'),
  bn: () => import('../locales/bn.json'),
  fa: () => import('../locales/fa.json'),
  sk: () => import('../locales/sk.json'),
};

const resources = {
  en: { common: en },
};

const BASE_LOCALE = 'en'
const SUPPORTED_LOCALES = new Set([BASE_LOCALE, ...Object.keys(LOCALE_LOADERS)])
const USER_PICKED_KEY = 'i18nextLng_userPicked'
const configuredDefaultLocale = (process.env.NEXT_PUBLIC_LEARNHOUSE_DEFAULT_LOCALE?.trim() || 'ru')
  .toLowerCase()
  .replace('_', '-')
  .split('-')[0]
const DEFAULT_LOCALE = SUPPORTED_LOCALES.has(configuredDefaultLocale) ? configuredDefaultLocale : 'ru'

export function normalizeLocale(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_LOCALE

  const code = value.trim().toLowerCase().replace('_', '-').split('-')[0]
  return SUPPORTED_LOCALES.has(code) ? code : DEFAULT_LOCALE
}

export type LocalePreferenceSource = 'stored' | 'cookie' | 'query' | 'default'

export type LocalePreference = {
  locale: string
  source: LocalePreferenceSource
}

export function detectLocalePreference(): LocalePreference {
  if (typeof window === 'undefined') return { locale: DEFAULT_LOCALE, source: 'default' }

  let stored: string | null = null
  try {
    stored = window.localStorage.getItem('i18nextLng')
  } catch {
    stored = null
  }
  if (stored) return { locale: normalizeLocale(stored), source: 'stored' }

  const cookie = document.cookie.match(/(?:^|;\s*)i18next=([^;]*)/)
  if (cookie) {
    try {
      return { locale: normalizeLocale(decodeURIComponent(cookie[1])), source: 'cookie' }
    } catch {
      return { locale: DEFAULT_LOCALE, source: 'default' }
    }
  }

  try {
    const query = new URLSearchParams(window.location.search).get('lng')
    if (query) return { locale: normalizeLocale(query), source: 'query' }
  } catch {
    return { locale: DEFAULT_LOCALE, source: 'default' }
  }

  return { locale: DEFAULT_LOCALE, source: 'default' }
}

export function detectPreferredLocale(): string {
  return detectLocalePreference().locale
}

export function hasExplicitLocalePreference(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (window.localStorage.getItem(USER_PICKED_KEY)) return true
  } catch {
    return detectLocalePreference().source !== 'default'
  }
  return detectLocalePreference().source !== 'default'
}

async function loadLocale(language: string): Promise<boolean> {
  const code = normalizeLocale(language)
  if (code === BASE_LOCALE) return true
  if (!LOCALE_LOADERS[code]) return false
  if (i18n.hasResourceBundle(code, 'common')) return true

  try {
    const mod = await LOCALE_LOADERS[code]();
    i18n.addResourceBundle(code, 'common', mod.default, true, true);
    return true
  } catch {
    return false
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: DEFAULT_LOCALE,
    ns: ['common'],
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
  if (!await loadLocale(locale)) return false
  await loadDateLocale(locale)
  applyDocumentDirection(locale)
  return true
}

function persistCookie(language: string): void {
  document.cookie = `i18next=${encodeURIComponent(language)}; path=/; max-age=31536000; samesite=lax`
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
