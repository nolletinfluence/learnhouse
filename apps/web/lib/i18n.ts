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

const DEFAULT_LOCALE = 'en'
const SUPPORTED_LOCALES = new Set([DEFAULT_LOCALE, ...Object.keys(LOCALE_LOADERS)])

export function normalizeLocale(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_LOCALE

  const code = value.trim().toLowerCase().replace('_', '-').split('-')[0]
  return SUPPORTED_LOCALES.has(code) ? code : DEFAULT_LOCALE
}

export function detectPreferredLocale(): string {
  if (typeof window === 'undefined') return DEFAULT_LOCALE

  let stored: string | null = null
  try {
    stored = window.localStorage.getItem('i18nextLng')
  } catch {
    stored = null
  }
  if (stored) return normalizeLocale(stored)

  const cookie = document.cookie.match(/(?:^|;\s*)i18next=([^;]*)/)
  if (cookie) {
    try {
      return normalizeLocale(decodeURIComponent(cookie[1]))
    } catch {
      return DEFAULT_LOCALE
    }
  }

  try {
    const query = new URLSearchParams(window.location.search).get('lng')
    if (query) return normalizeLocale(query)
  } catch {
    return DEFAULT_LOCALE
  }

  return normalizeLocale(window.navigator.languages?.[0] || window.navigator.language)
}

async function loadLocale(language: string): Promise<void> {
  const code = normalizeLocale(language)
  if (code === DEFAULT_LOCALE || !LOCALE_LOADERS[code]) return
  if (i18n.hasResourceBundle(code, 'common')) return;

  try {
    const mod = await LOCALE_LOADERS[code]();
    i18n.addResourceBundle(code, 'common', mod.default, true, true);
  } catch {
    return
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

export async function prepareLocale(language: string): Promise<void> {
  const locale = normalizeLocale(language)
  await Promise.all([loadLocale(locale), loadDateLocale(locale)])
  applyDocumentDirection(locale)
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

export async function changeLanguage(language: string): Promise<void> {
  const locale = normalizeLocale(language)
  await prepareLocale(locale)
  await i18n.changeLanguage(locale)
  persistLocale(locale)
}

export default i18n;
