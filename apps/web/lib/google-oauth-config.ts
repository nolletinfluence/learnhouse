export type GoogleOAuthEnvironment = Readonly<Record<string, string | undefined> & {
  LEARNHOUSE_GOOGLE_CLIENT_ID?: string
  LEARNHOUSE_GOOGLE_CLIENT_SECRET?: string
  LEARNHOUSE_GOOGLE_OAUTH_CLIENT_ID?: string
}>

export type GoogleOAuthConfig = Readonly<{
  configured: boolean
  callbackUri: string
  clientId?: string
  audience?: string
  readClientSecret: () => string | undefined
}>

function clean(value: string | undefined) {
  return value?.trim() || undefined
}

export function resolveGoogleOAuthConfig(
  environment: GoogleOAuthEnvironment,
  publicOrigin: string
): GoogleOAuthConfig {
  const clientId = clean(environment.LEARNHOUSE_GOOGLE_CLIENT_ID)
  const clientSecret = clean(environment.LEARNHOUSE_GOOGLE_CLIENT_SECRET)
  const audience = clean(environment.LEARNHOUSE_GOOGLE_OAUTH_CLIENT_ID)
  const origin = new URL(publicOrigin)
  const callbackUri = new URL('/auth/callback/google', origin.origin).toString()

  return {
    configured: Boolean(clientId && clientSecret && audience),
    callbackUri,
    clientId,
    audience,
    readClientSecret: () => clientSecret,
  }
}
