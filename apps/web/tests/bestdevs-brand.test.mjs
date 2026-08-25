import { describe, expect, test } from 'bun:test'

import {
  BESTDEVS_LMS_NAME,
  BESTDEVS_ORGANIZATION_NAME,
  resolveBestDevsAdminUrl,
  resolveBestDevsLandingUrl,
} from '../lib/bestdevs-brand.ts'

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
})
