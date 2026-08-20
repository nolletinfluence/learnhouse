import { describe, expect, test } from 'bun:test'

import {
  resolveBestDevsAdminUrl,
  resolveBestDevsLandingUrl,
} from '../lib/bestdevs-brand.ts'

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
