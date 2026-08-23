import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { Window } from 'happy-dom'
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

function installBrowserState({ stored, cookie, query = '' }: { stored?: string; cookie?: string; query?: string } = {}) {
  const browser = new Window({ url: `http://localhost/${query}` })
  if (stored) browser.localStorage.setItem('i18nextLng', stored)
  if (cookie) browser.document.cookie = `i18next=${cookie}; path=/`
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: browser.document })
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: browser.navigator })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: browser.localStorage })
  return browser
}

installBrowserState()
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true })

const { default: i18n, changeLanguage } = await import('../lib/i18n')
const { default: I18nProvider } = await import('../components/Contexts/I18nContext')
const { OrgContext } = await import('../components/Contexts/OrgContext')
const { default: OrgLanguageSync } = await import('../components/Contexts/OrgLanguageSync')

let activeRoot: Root | undefined

async function waitForLanguage(language: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (i18n.language.split('-')[0] === language) return
    await act(() => new Promise((resolve) => setTimeout(resolve, 10)))
  }
  assert.equal(i18n.language.split('-')[0], language)
}

async function mountProvider() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  activeRoot = createRoot(container)
  await act(async () => {
    activeRoot?.render(React.createElement(I18nProvider, null, React.createElement('span')))
  })
}

async function mountOrganizationDefault(language: string) {
  const org = {
    config: { config: { customization: { general: { default_language: language } } } },
  }
  await act(async () => {
    activeRoot?.render(
      React.createElement(
        I18nProvider,
        null,
        React.createElement(
          OrgContext.Provider,
          { value: { org, isUserPartOfTheOrg: true, orgslug: 'bestdevs' } },
          React.createElement(OrgLanguageSync),
        ),
      ),
    )
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
}

afterEach(async () => {
  if (activeRoot) await act(async () => activeRoot?.unmount())
  activeRoot = undefined
})

describe('I18nProvider and OrgLanguageSync preference precedence', () => {
  for (const preference of [
    { label: 'local storage', state: { stored: 'de-DE' }, expected: 'de' },
    { label: 'cookie', state: { cookie: 'es-MX' }, expected: 'es' },
    { label: 'query', state: { query: '?lng=uk-UA' }, expected: 'uk' },
  ]) {
    test(`${preference.label} preference survives organization synchronization`, async () => {
      installBrowserState(preference.state)
      await i18n.changeLanguage('en')
      await mountProvider()
      await waitForLanguage(preference.expected)
      assert.equal(localStorage.getItem('i18nextLng_userPicked'), '1')
      await mountOrganizationDefault('ru')
      await act(() => new Promise((resolve) => setTimeout(resolve, 100)))
      assert.equal(i18n.language.split('-')[0], preference.expected)
    })
  }

  test('explicit user selection survives organization synchronization', async () => {
    installBrowserState()
    await i18n.changeLanguage('en')
    await mountProvider()
    await waitForLanguage('ru')
    await act(async () => {
      await changeLanguage('de')
    })
    assert.equal(localStorage.getItem('i18nextLng_userPicked'), '1')
    await mountOrganizationDefault('ru')
    await act(() => new Promise((resolve) => setTimeout(resolve, 100)))
    assert.equal(i18n.language.split('-')[0], 'de')
  })

  test('a clean session remains Russian for the BestDevs organization', async () => {
    installBrowserState()
    await i18n.changeLanguage('en')
    await mountProvider()
    await waitForLanguage('ru')
    await mountOrganizationDefault('ru')
    await waitForLanguage('ru')
  })
})
