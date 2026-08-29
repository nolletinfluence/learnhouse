import { getConfig } from '@services/config/config'

export const BESTDEVS_LMS_NAME = 'BestDevs LMS'
export const BESTDEVS_ORGANIZATION_NAME = 'BestDevs'

function normalizePublicUrl(value: string | undefined, fallback: string) {
  return value?.trim().replace(/\/+$/, '') || fallback
}

function normalizeOptionalPublicUrl(value: string | undefined) {
  return value?.trim().replace(/\/+$/, '') || null
}

export function resolveBestDevsAdminUrl(value = getConfig('NEXT_PUBLIC_BESTDEVS_ADMIN_URL')) {
  return normalizePublicUrl(value, 'http://localhost:3006')
}

export function resolveBestDevsLandingUrl(value = getConfig('NEXT_PUBLIC_BESTDEVS_LANDING_URL')) {
  return normalizePublicUrl(value, 'http://localhost:3005')
}

export function resolveBestDevsApplyUrl(value = getConfig('NEXT_PUBLIC_BESTDEVS_LANDING_URL')) {
  return `${resolveBestDevsLandingUrl(value)}/#apply`
}

export function resolveBestDevsLogoUrl(value = getConfig('NEXT_PUBLIC_BESTDEVS_LANDING_URL')) {
  return `${resolveBestDevsLandingUrl(value)}/brand/bestdevs-logo.png`
}

export function resolveBestDevsTermsUrl(value = getConfig('NEXT_PUBLIC_BESTDEVS_TERMS_URL')) {
  return normalizeOptionalPublicUrl(value)
}

export function resolveBestDevsPrivacyUrl(value = getConfig('NEXT_PUBLIC_BESTDEVS_PRIVACY_URL')) {
  return normalizeOptionalPublicUrl(value)
}
