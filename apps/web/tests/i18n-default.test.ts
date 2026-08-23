import assert from 'node:assert/strict'
import { beforeEach, describe, test } from 'node:test'

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
const { detectPreferredLocale } = await import('../lib/i18n')

describe('BestDevs locale preference defaults', () => {
  beforeEach(() => installBrowserState())

  test('a clean session uses Russian instead of the browser language', () => {
    assert.equal(detectPreferredLocale(), 'ru')
  })

  test('a saved local storage selection wins over the configured default', () => {
    installBrowserState({ stored: 'de-DE' })
    assert.equal(detectPreferredLocale(), 'de')
  })

  test('a saved cookie selection wins when local storage is empty', () => {
    installBrowserState({ cookie: 'i18next=es-MX' })
    assert.equal(detectPreferredLocale(), 'es')
  })

  test('an explicit query selection wins when no saved selection exists', () => {
    installBrowserState({ query: '?lng=uk-UA' })
    assert.equal(detectPreferredLocale(), 'uk')
  })
})
