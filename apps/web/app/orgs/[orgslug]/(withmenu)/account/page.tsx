import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth/server'
import { serverLocale } from '@/lib/locale-server'
import { getOrganizationContextInfo } from '@services/organizations/orgs'
import AccountClient from '@components/Objects/Account/AccountClient'

export async function generateMetadata({ params }: { params: Promise<{ orgslug: string }> }): Promise<Metadata> {
  const locale = await serverLocale()
  const org = await getOrganizationContextInfo((await params).orgslug, { revalidate: 120, tags: ['organizations'] })
  return { title: `${locale === 'ru' ? 'Моё обучение' : 'My learning'} — ${org.name}`,
    robots: { index: false, follow: false } }
}

export default async function AccountPage({ params }: { params: Promise<{ orgslug: string }> }) {
  const { orgslug } = await params
  if (!await getServerSession()) redirect('/login?next=/account')
  const org = await getOrganizationContextInfo(orgslug, { revalidate: 120, tags: ['organizations'] })
  return <AccountClient orgslug={orgslug} org_id={org.id} subpage="learning" />
}
