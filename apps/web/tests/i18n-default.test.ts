import assert from 'node:assert/strict'
import { after, afterEach, beforeEach, describe, test } from 'node:test'

const browserGlobalNames = ['window', 'document', 'navigator'] as const
const originalGlobals = new Map(browserGlobalNames.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]))

function restoreBrowserState() {
  for (const name of browserGlobalNames) {
    const descriptor = originalGlobals.get(name)
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else Reflect.deleteProperty(globalThis, name)
  }
}

type BrowserState = {
  stored?: string | null
  cookie?: string
  query?: string
  languages?: string[]
  language?: string
}

function installBrowserState({
  stored = null,
  cookie = '',
  query = '',
  languages = ['fr-FR'],
  language = 'fr-FR',
}: BrowserState = {}): void {
  const localStorage = {
    getItem: (key: string) => key === 'i18nextLng' ? stored : null,
    setItem: () => undefined,
  }
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage,
      location: { search: query },
      navigator: { languages, language },
    },
  })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { cookie, documentElement: { dir: 'ltr', lang: '' } },
  })
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { languages, language },
  })
}

installBrowserState()
after(restoreBrowserState)
const { detectPreferredLocale } = await import('../lib/i18n')

describe('BestDevs locale preference defaults', () => {
  beforeEach(() => installBrowserState())
  afterEach(restoreBrowserState)

  test('a clean session uses Russian instead of the browser language', () => {
    assert.equal(detectPreferredLocale(), 'ru')
  })

  test('a saved local storage selection wins over the configured default', () => {
    installBrowserState({ stored: 'en-US' })
    assert.equal(detectPreferredLocale(), 'en')
  })

  test('a saved cookie selection wins when local storage is empty', () => {
    installBrowserState({ cookie: 'i18next=ru_RU' })
    assert.equal(detectPreferredLocale(), 'ru')
  })

  test('an explicit query selection wins when no saved selection exists', () => {
    installBrowserState({ query: '?lng=en-GB' })
    assert.equal(detectPreferredLocale(), 'en')
  })
  test('unsupported saved languages do not mask a valid cookie', () => {
    installBrowserState({ stored: 'ar', cookie: 'i18next=en-US' })
    assert.equal(detectPreferredLocale(), 'en')
  })

  test('unsupported and malformed preferences fall back to Russian', () => {
    installBrowserState({ stored: 'fr', cookie: 'i18next=%INVALID', query: '?lng=de' })
    assert.equal(detectPreferredLocale(), 'ru')
  })

})
