import { serverLocale } from '@/lib/locale-server'
import { getOrganizationContextInfo } from '@services/organizations/orgs'
import { getAuthOrgSlug } from '@services/org/orgResolution'
import LoginClient from './login'
import { Metadata } from 'next'
import OrgNotFound from '@components/Objects/StyledElements/Error/OrgNotFound'

export async function generateMetadata(): Promise<Metadata> {
  const title = (await serverLocale()) === 'en' ? 'Login' : 'Вход'
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

const Login = async () => {
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
    <div>
      <LoginClient org={org}></LoginClient>
    </div>
  )
}

export default Login
