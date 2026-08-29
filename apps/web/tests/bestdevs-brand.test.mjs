import { describe, expect, test } from 'bun:test'

import * as brand from '../lib/bestdevs-brand.ts'

const {
  BESTDEVS_LMS_NAME,
  BESTDEVS_ORGANIZATION_NAME,
  resolveBestDevsAdminUrl,
  resolveBestDevsLandingUrl,
  resolveBestDevsPrivacyUrl,
  resolveBestDevsTermsUrl,
} = brand

describe('BestDevs LMS product identity', () => {
  test('exposes the canonical product and tenant names', () => {
    expect(BESTDEVS_LMS_NAME).toBe('BestDevs LMS')
    expect(BESTDEVS_ORGANIZATION_NAME).toBe('BestDevs')
  })
})

describe('BestDevs platform links', () => {
  test('use configured URLs without trailing slashes', () => {
    expect(resolveBestDevsAdminUrl('https://admin.bestdevs.dev///')).toBe('https://admin.bestdevs.dev')
    expect(resolveBestDevsLandingUrl('https://bestdevs.dev/')).toBe('https://bestdevs.dev')
  })

  test('fall back to the local integrated platform', () => {
    expect(resolveBestDevsAdminUrl()).toBe('http://localhost:3006')
    expect(resolveBestDevsLandingUrl()).toBe('http://localhost:3005')
  })

  test('derive public BestDevs destinations from the configured landing URL', () => {
    expect(typeof brand.resolveBestDevsApplyUrl).toBe('function')
    expect(typeof brand.resolveBestDevsLogoUrl).toBe('function')
    expect(brand.resolveBestDevsApplyUrl('https://bestdevs.dev///')).toBe('https://bestdevs.dev/#apply')
    expect(brand.resolveBestDevsLogoUrl('https://bestdevs.dev///')).toBe(
      'https://bestdevs.dev/brand/bestdevs-logo.png',
    )
  })

  test('read browser runtime configuration', () => {
    globalThis.window = {
      __RUNTIME_CONFIG__: {
        NEXT_PUBLIC_BESTDEVS_LANDING_URL: 'https://runtime.bestdevs.dev/',
      },
    }

    expect(resolveBestDevsLandingUrl()).toBe('https://runtime.bestdevs.dev')
    delete globalThis.window
  })

  test('only exposes legal links when explicitly configured', () => {
    expect(resolveBestDevsTermsUrl('https://bestdevs.dev/terms/')).toBe('https://bestdevs.dev/terms')
    expect(resolveBestDevsPrivacyUrl('')).toBeNull()
  })
})
