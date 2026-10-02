import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const webRoot = path.resolve(import.meta.dirname, '..')
const read = (file) => fs.readFileSync(path.join(webRoot, file), 'utf8')
const layoutSource = read('app/layout.tsx')
const i18nSource = read('lib/i18n.ts')
const localeSource = read('lib/locale.ts')
const providerSource = read('components/Contexts/I18nContext.tsx')
const dirInitSource = read('public/dir-init.js')
const orgNotFoundSource = read('components/Objects/StyledElements/Error/OrgNotFound.tsx')

function runDirInit({ stored, cookie = '', search = '', languages = [], language } = {}) {
  const attributes = new Map()
  const style = new Map()
  const context = {
    document: {
      cookie,
      documentElement: {
        getAttribute: () => 'ru',
        setAttribute: (name, value) => attributes.set(name, value),
        style: { setProperty: (name, value) => style.set(name, value) },
      },
    },
    localStorage: { getItem: () => stored ?? null },
    location: { search },
    navigator: { languages, language },
    URLSearchParams,
  }

  vm.runInNewContext(dirInitSource, context)
  return { attributes, style }
}

describe('pre-hydration bootstrap', () => {
  test('renders all startup scripts through Next before interaction', () => {
    expect(layoutSource).toMatch(/import Script from ['"]next\/script['"]/)
    for (const source of ['/dir-init.js', '/runtime-config.js', '/embed-bg.js']) {
      expect(layoutSource).toMatch(new RegExp(`<Script src="${source}" strategy="beforeInteractive"`))
    }
    expect(layoutSource).not.toMatch(/<script\s+src=/)
  })

  test('defers language detection until after the fixed Russian default hydration render', () => {
    expect(i18nSource).toMatch(/lng:\s*DEFAULT_LOCALE/,)
    expect(i18nSource).not.toMatch(/\.use\(LanguageDetector\)/)
    expect(providerSource).toMatch(/useEffect\([\s\S]*initializeLanguage/)
  })

  test('keeps locale preparation and document updates synchronized', () => {
    expect(localeSource).toMatch(/export function normalizeLocale\(value: unknown\): Locale/)
    expect(i18nSource).toMatch(/export function detectPreferredLocale\(\): string/)
    expect(i18nSource).toMatch(/export async function prepareLocale\(language: string\): Promise<boolean>/)
    const prepareLocale = i18nSource.match(/export async function prepareLocale[\s\S]*?\n\}/)?.[0]
    expect(i18nSource).toContain('school: schoolRu')
    expect(i18nSource).toContain('school: schoolEn')
    expect(prepareLocale).toMatch(/loadDateLocale\(locale\)/)
    expect(prepareLocale).toMatch(/applyDocumentDirection\(locale\)/)
  })

  test('uses the same ordered preference sources in runtime and pre-paint detection', () => {
    for (const source of [localeSource, dirInitSource]) {
      const positions = ['i18nextLng', 'document.cookie', 'URLSearchParams'].map((term) => source.indexOf(term))
      expect(positions.every((position) => position >= 0)).toBe(true)
      expect(positions).toEqual([...positions].sort((a, b) => a - b))
    }
    expect(localeSource).not.toContain('navigator')
  })

  test('falls back to Russian LTR for missing or malformed locale preferences', () => {
    for (const result of [
      runDirInit(),
      runDirInit({ stored: 'not-a-locale' }),
      runDirInit({ cookie: 'i18next=%E0%A4%A' }),
    ]) {
      expect(result.attributes.get('lang')).toBe('ru')
      expect(result.attributes.get('dir')).toBe('ltr')
      expect(result.style.get('--dir')).toBe('1')
    }
  })

  test('applies persisted Russian and English preferences and ignores legacy Arabic', () => {
    for (const [locale, lang, dir, multiplier] of [
      ['ru', 'ru', 'ltr', '1'],
      ['ar', 'ru', 'ltr', '1'],
      ['en', 'en', 'ltr', '1'],
    ]) {
      const result = runDirInit({ stored: locale })
      expect(result.attributes.get('lang')).toBe(lang)
      expect(result.attributes.get('dir')).toBe(dir)
      expect(result.style.get('--dir')).toBe(multiplier)
    }
  })

  test('switches translation resources, dayjs, language, and direction together', async () => {
    const attributes = new Map()
    const style = new Map()
    const hadWindow = 'window' in globalThis
    const hadDocument = 'document' in globalThis
    const originalWindow = globalThis.window
    const originalDocument = globalThis.document
    const storage = new Map()

    globalThis.window = {
      localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
      },
      location: { search: '' },
      navigator: { languages: ['en'], language: 'en' },
    }
    globalThis.document = {
      cookie: '',
      documentElement: {
        setAttribute: (name, value) => attributes.set(name, value),
        style: { setProperty: (name, value) => style.set(name, value) },
      },
    }

    try {
      const { changeLanguage, default: i18n } = await import('../lib/i18n.ts')
      const { default: dayjs } = await import('dayjs')

      for (const [requested, locale, dir, multiplier] of [
        ['ru', 'ru', 'ltr', '1'],
        ['ar', 'ru', 'ltr', '1'],
        ['en', 'en', 'ltr', '1'],
      ]) {
        await changeLanguage(requested)
        expect(i18n.language).toBe(locale)
        expect(i18n.hasResourceBundle(locale, 'common')).toBe(true)
        expect(dayjs.locale()).toBe(locale)
        expect(attributes.get('lang')).toBe(locale)
        expect(attributes.get('dir')).toBe(dir)
        expect(style.get('--dir')).toBe(multiplier)
        expect(storage.get('i18nextLng')).toBe(locale)
        expect(document.cookie).toContain(`i18next=${locale}`)
      }
    } finally {
      if (hadWindow) globalThis.window = originalWindow
      else delete globalThis.window
      if (hadDocument) globalThis.document = originalDocument
      else delete globalThis.document
    }
  })

  test('normalizes an unsupported locale without loading its archived bundle', async () => {
    const attributes = new Map([['lang', 'en'], ['dir', 'ltr']])
    const style = new Map([['--dir', '1']])
    const storage = new Map([['i18nextLng', 'en']])
    const hadWindow = 'window' in globalThis
    const hadDocument = 'document' in globalThis
    const originalWindow = globalThis.window
    const originalDocument = globalThis.document

    globalThis.window = {
      localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
      },
      location: { search: '' },
      navigator: { languages: ['en'], language: 'en' },
    }
    globalThis.document = {
      cookie: 'i18next=en',
      documentElement: {
        setAttribute: (name, value) => attributes.set(name, value),
        style: { setProperty: (name, value) => style.set(name, value) },
      },
    }

    try {
      const { changeLanguage, default: i18n } = await import('../lib/i18n.ts')
      const { default: dayjs } = await import('dayjs')
      const changed = await changeLanguage('fr')

      expect(changed).toBe(true)
      expect(i18n.language).toBe('ru')
      expect(dayjs.locale()).toBe('ru')
      expect(attributes).toEqual(new Map([['lang', 'ru'], ['dir', 'ltr']]))
      expect(style).toEqual(new Map([['--dir', '1']]))
      expect(storage.get('i18nextLng')).toBe('ru')
      expect(document.cookie).toContain('i18next=ru')
    } finally {
      if (hadWindow) globalThis.window = originalWindow
      else delete globalThis.window
      if (hadDocument) globalThis.document = originalDocument
      else delete globalThis.document
    }
  })

  test('renders the organization fallback from the settled English and Russian resources', async () => {
    expect(orgNotFoundSource).toMatch(/useTranslation/)
    expect(orgNotFoundSource).toMatch(/org_not_found\.title/)
    const { changeLanguage, default: i18n } = await import('../lib/i18n.ts')

    await changeLanguage('ru')
    expect(i18n.t('org_not_found.title')).toBe('Введите вашу организацию')
    expect(i18n.t('org_not_found.continue')).toBe('Продолжить')

    await changeLanguage('en')
    expect(i18n.t('org_not_found.title')).toBe('Enter Your Organization')
    expect(i18n.t('org_not_found.continue')).toBe('Continue')
  })
})
