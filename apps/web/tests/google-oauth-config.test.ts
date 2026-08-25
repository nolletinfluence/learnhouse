import { describe, expect, test } from 'bun:test'

import { resolveGoogleOAuthConfig } from '../lib/google-oauth-config'

const completeEnvironment = {
  LEARNHOUSE_GOOGLE_CLIENT_ID: 'bestdevs-web-client',
  LEARNHOUSE_GOOGLE_CLIENT_SECRET: 'server-only-secret',
  LEARNHOUSE_GOOGLE_OAUTH_CLIENT_ID: 'bestdevs-api-audience',
}

describe('Google OAuth configuration', () => {
  test.each([
    'LEARNHOUSE_GOOGLE_CLIENT_ID',
    'LEARNHOUSE_GOOGLE_CLIENT_SECRET',
    'LEARNHOUSE_GOOGLE_OAUTH_CLIENT_ID',
  ] as const)('is unavailable when %s is missing', (missingKey) => {
    const environment = { ...completeEnvironment, [missingKey]: undefined }

    expect(resolveGoogleOAuthConfig(environment, 'http://localhost:3000').configured).toBe(false)
  })

  test('returns the exact callback without serializing the client secret', () => {
    const config = resolveGoogleOAuthConfig(completeEnvironment, 'https://lms.bestdevs.dev/path')

    expect(config.configured).toBe(true)
    expect(config.callbackUri).toBe('https://lms.bestdevs.dev/auth/callback/google')
    expect(config.readClientSecret()).toBe('server-only-secret')
    expect(JSON.stringify(config)).not.toContain('server-only-secret')
  })
})
