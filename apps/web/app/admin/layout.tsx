import type { Metadata } from 'next'
import AdminProviders from './providers'
import React from 'react'
import { fetchInstanceMode, isSuperadminSurfaceBlocked } from '@lib/eeGate'
import EERequiredScreen from '@components/Security/EERequiredScreen'
import { BESTDEVS_LMS_NAME } from '@lib/bestdevs-brand'

// The gate is resolved per request. An ISR-cached result would outlive a
// licence change, and this layout is what decides whether /admin exists.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: {
    template: `%s | ${BESTDEVS_LMS_NAME} Admin`,
    default: `${BESTDEVS_LMS_NAME} Admin`,
  },
}

// Wraps everything under /admin, including /admin/login, which sits outside
// the (dashboard) route group and was previously ungated. Returning the screen
// here short-circuits AdminProviders, so OSS never bootstraps a session or
// renders the login form.
export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (isSuperadminSurfaceBlocked(await fetchInstanceMode())) {
    return <EERequiredScreen />
  }

  return <AdminProviders>{children}</AdminProviders>
}
