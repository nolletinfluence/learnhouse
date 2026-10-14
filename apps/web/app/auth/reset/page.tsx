import { serverLocale } from '@/lib/locale-server'
import { getOrganizationContextInfo } from '@services/organizations/orgs'
import { getAuthOrgSlug } from '@services/org/orgResolution'
import ResetPasswordClient from './reset'
import { Metadata } from 'next'
import OrgNotFound from '@components/Objects/StyledElements/Error/OrgNotFound'
import { Suspense } from 'react'
import PageLoading from '@components/Objects/Loaders/PageLoading'

export async function generateMetadata(): Promise<Metadata> {
  const title = (await serverLocale()) === 'en' ? 'Reset Password' : 'Новый пароль'
  const orgslug = await getAuthOrgSlug()

  if (!orgslug) {
    return { title: `${title} — BestDevs LMS`, robots: { index: false, follow: false } }
  }

  let org: any = null
  try {
    org = await getOrganizationContextInfo(orgslug, {
      revalidate: 60,
      tags: ['organizations'],
    })
  } catch {
    org = null
  }

  return {
    title: title + ` — ${org?.name || 'BestDevs LMS'}`,
    robots: { index: false, follow: false },
  }
}

const ResetPasswordPage = async () => {
  const orgslug = await getAuthOrgSlug()

  let org: any = null
  if (orgslug) {
    try {
      org = await getOrganizationContextInfo(orgslug, {
        revalidate: 60,
        tags: ['organizations'],
      })
    } catch {
      org = null
    }
    if (!org) {
      return <OrgNotFound />
    }
  }

  return (
    <Suspense fallback={<PageLoading />}>
      <ResetPasswordClient org={org} />
    </Suspense>
  )
}

export default ResetPasswordPage
