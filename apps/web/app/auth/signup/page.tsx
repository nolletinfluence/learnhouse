import { serverLocale } from '@/lib/locale-server'
import { Metadata } from 'next'
import { getOrganizationContextInfo } from '@services/organizations/orgs'
import { getAuthOrgSlug } from '@services/org/orgResolution'
import SignUpClient from './signup'
import { Suspense } from 'react'
import PageLoading from '@components/Objects/Loaders/PageLoading'
import OrgNotFound from '@components/Objects/StyledElements/Error/OrgNotFound'

export async function generateMetadata(): Promise<Metadata> {
  const title = (await serverLocale()) === 'en' ? 'Sign up' : 'Регистрация'
  const orgslug = await getAuthOrgSlug()

  if (!orgslug) {
    return { title: `${title} — BestDevs LMS`, robots: { index: false, follow: false } }
  }

  let org: any = null
  try {
    org = await getOrganizationContextInfo(orgslug, null)
  } catch {
    org = null
  }

  return {
    title: title + ` — ${org?.name || 'BestDevs LMS'}`,
    robots: { index: false, follow: false },
  }
}

const SignUp = async () => {
  const orgslug = await getAuthOrgSlug()

  let org: any = null
  if (orgslug) {
    try {
      org = await getOrganizationContextInfo(orgslug, null)
    } catch {
      org = null
    }

    if (!org) {
      return <OrgNotFound />
    }
  }

  return (
    <>
      <Suspense fallback={<PageLoading />}>
        <SignUpClient org={org} />
      </Suspense>
    </>
  )
}

export default SignUp
