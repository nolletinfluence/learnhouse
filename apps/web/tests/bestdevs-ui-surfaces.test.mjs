import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

const webRoot = join(import.meta.dir, '..')
const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx'])
const legacyAssetPattern = /(?:\/(?:lrn(?:-dash|-text)?\.svg|lrnai_icon\.png)|public\/(?:black_logo\.png|lrnai_icon\.png|learnhouse_(?:bigicon(?:_1)?|ai_simple(?:_colored)?|ai_black_logo)\.png))/i
const legacyPublicUrlPattern = /(?:https?:\/\/(?:www\.)?(?:learnhouse\.(?:app|io)|docs\.learnhouse\.app|university\.learnhouse\.io|classroom\.learnhouse\.io)|https?:\/\/discord\.gg\/learnhouse|mailto:[^\s"'`]*@learnhouse\.(?:app|io))/i

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? filesUnder(path) : [path]
  })
}

function stringValues(value) {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(stringValues)
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringValues)
  return []
}

function legacyNamedValues(value) {
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, entry]) => {
    const current = typeof entry === 'string' && /learnhouse/i.test(key) ? [entry] : []
    return current.concat(legacyNamedValues(entry))
  })
}

describe('BestDevs LMS user-facing surfaces', () => {
  test('ships the BestDevs logo as both the shared asset and app icon', () => {
    const logoPath = join(webRoot, 'public', 'bestdevs-logo.png')
    const iconAssetPath = join(webRoot, 'public', 'bestdevs-icon.png')
    const iconPath = join(webRoot, 'app', 'icon.png')

    expect(existsSync(logoPath)).toBe(true)
    expect(existsSync(iconAssetPath)).toBe(true)
    expect(existsSync(iconPath)).toBe(true)
    expect(statSync(logoPath).size).toBeGreaterThan(0)
    expect(readFileSync(iconPath)).toEqual(readFileSync(iconAssetPath))
    expect(readFileSync(iconAssetPath)).not.toEqual(readFileSync(logoPath))
  })

  test('does not publish legacy brand assets', () => {
    const legacyAssets = [
      'UNI_LOGO.png',
      'black_logo.png',
      'learnhouse_ai_black_logo.png',
      'learnhouse_ai_simple.png',
      'learnhouse_ai_simple_colored.png',
      'learnhouse_bigicon.png',
      'learnhouse_bigicon_1.png',
      'learnhouse_icon.png',
      'learnhouse_logo.png',
      'learnhouse_text_white.png',
      'lrn-dash.svg',
      'lrn-text.svg',
      'lrn.svg',
      'lrnai_icon.png',
      'theclassroom.png',
    ]

    expect(legacyAssets.filter((asset) => existsSync(join(webRoot, 'public', asset)))).toEqual([])
  })

  test('does not reference legacy visual assets or public links from UI source', () => {
    const offenders = filesUnder(join(webRoot, 'app'))
      .concat(filesUnder(join(webRoot, 'components')))
      .filter((file) => sourceExtensions.has(extname(file)))
      .flatMap((file) => {
        const source = readFileSync(file, 'utf8')
        return legacyAssetPattern.test(source) || legacyPublicUrlPattern.test(source)
          ? [relative(webRoot, file)]
          : []
      })

    expect(offenders).toEqual([])
  })

  test('keeps translated user-facing copy free of the legacy product name', () => {
    const offenders = filesUnder(join(webRoot, 'locales'))
      .filter((file) => extname(file) === '.json')
      .flatMap((file) => {
        const translations = JSON.parse(readFileSync(file, 'utf8'))
        const legacyValues = stringValues(translations)
          .filter((value) => /learnhouse/i.test(value) && !/LEARNHOUSE_[A-Z0-9_]+/.test(value))
        const untranslatedLegacyKeys = legacyNamedValues(translations)
          .filter((value) => !/BestDevs LMS/i.test(value))
        return legacyValues.length > 0 || untranslatedLegacyKeys.length > 0
          ? [relative(webRoot, file)]
          : []
      })

    expect(offenders).toEqual([])
  })
})
