import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import vm from 'node:vm'
import { normalizeLocale, supportedLocale, SUPPORTED_LOCALES } from '../lib/locale'
import { formatDate, formatNumber, formatRelative, loadDateLocale } from '../lib/format'
import { lessonDateLabel } from '../lib/learning'
import schoolEn from '../locales/school.en.json'
import schoolRu from '../locales/school.ru.json'
import en from '../locales/en.json'
import ru from '../locales/ru.json'

function flatten(value: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => child && typeof child === 'object' && !Array.isArray(child)
    ? Object.entries(flatten(child as Record<string, unknown>, `${prefix}${key}.`))
    : [[`${prefix}${key}`, child]]))
}

function placeholders(value: unknown) {
  return typeof value === 'string' ? (value.match(/\{\{[^}]+\}\}/g) ?? []).sort() : []
}

describe('Russian and English localization', () => {
  test('only RU and EN are allowed, including regional codes', () => {
    expect(SUPPORTED_LOCALES).toEqual(['ru', 'en'])
    expect(supportedLocale(' EN_us ')).toBe('en')
    expect(supportedLocale('ru-RU')).toBe('ru')
    for (const value of ['fr', 'ar', 'sk', null, undefined, {}]) {
      expect(supportedLocale(value)).toBeUndefined()
      expect(normalizeLocale(value)).toBe('ru')
    }
  })

  test('both dictionaries cover all UI keys without losing interpolation values', () => {
    for (const [english, russian] of ([[flatten(en), flatten(ru)], [schoolEn, schoolRu]] as Array<[Record<string, unknown>, Record<string, unknown>]>)) {
      expect(Object.keys(russian).sort()).toEqual(Object.keys(english).sort())
      for (const key of Object.keys(english)) {
        expect(placeholders(russian[key])).toEqual(placeholders(english[key]))
      }
    }
    expect(schoolEn['Календарь занятий']).toBe('Lesson calendar')
  })

  test('dates, time zones and numbers follow the selected language', async () => {
    const date = '2026-10-02T09:00:00Z'
    expect(formatDate(date, 'en')).toContain('Oct')
    expect(formatDate(date, 'ru')).toContain('окт')
    expect(lessonDateLabel(date, 'Asia/Bishkek', 'en')).toContain('October')
    expect(lessonDateLabel(date, 'Asia/Bishkek', 'ru')).toContain('октября')
    expect(lessonDateLabel(undefined, 'UTC', 'en')).toBe('Date not scheduled yet')
    expect(formatNumber(1.5, 'en')).toBe('1.5')
    expect(formatNumber(1.5, 'ar')).toBe('1,5')
    await loadDateLocale('ru')
    expect(formatRelative(Date.now() - 120_000, 'ru')).toContain('назад')
    await loadDateLocale('en')
    expect(formatRelative(Date.now() - 120_000, 'en')).toContain('ago')
  })

  test('pre-hydration bootstrap ignores unsupported storage and always uses LTR', () => {
    const source = fs.readFileSync(new URL('../public/dir-init.js', import.meta.url), 'utf8')
    for (const [stored, cookie, query, expected] of [['ar', 'i18next=en-US', '', 'en'], ['', '', '?lng=ru_RU', 'ru'], ['fr', 'i18next=%broken', '?lng=de', 'ru']]) {
      const attributes: Record<string, string> = {}
      vm.runInNewContext(source, {
        localStorage: { getItem: () => stored },
        location: { search: query },
        URLSearchParams,
        document: { cookie, documentElement: { getAttribute: () => 'ru', setAttribute: (key: string, value: string) => { attributes[key] = value }, style: { setProperty: () => undefined } } },
      })
      expect(attributes).toEqual({ lang: expected, dir: 'ltr' })
    }
  })
})
