function normalizePublicUrl(value: string | undefined, fallback: string) {
  return value?.trim().replace(/\/+$/, '') || fallback
}

export function resolveBestDevsAdminUrl(value = process.env.NEXT_PUBLIC_BESTDEVS_ADMIN_URL) {
  return normalizePublicUrl(value, 'http://localhost:3006')
}

export function resolveBestDevsLandingUrl(value = process.env.NEXT_PUBLIC_BESTDEVS_LANDING_URL) {
  return normalizePublicUrl(value, 'http://localhost:3005')
}
