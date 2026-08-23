'use client'

import { useEffect } from 'react'
import { useOrg } from './OrgContext'
import { syncOrganizationLanguage } from '@/lib/i18n'

export default function OrgLanguageSync() {
  const org = useOrg() as any

  const orgDefault: string | undefined =
    org?.config?.config?.customization?.general?.default_language ||
    org?.config?.config?.general?.default_language

  useEffect(() => {
    if (!orgDefault) return
    void syncOrganizationLanguage(orgDefault)
  }, [orgDefault])

  return null
}
