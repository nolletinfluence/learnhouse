import { getOrganizationContextInfo } from '@services/organizations/orgs'
import { Metadata } from 'next'
import { getServerSession } from '@/lib/auth/server'
import { getOrgThumbnailMediaDirectory } from '@services/media/media'
import AccountClient from '@components/Objects/Account/AccountClient'
import { redirect } from 'next/navigation'
import { serverLocale } from '@/lib/locale-server'

type MetadataProps = {
  params: Promise<{ orgslug: string; subpage: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const VALID_SUBPAGES = ['general', 'profile', 'security', 'purchases']

const getSubpageTitle = (subpage: string, locale: string): string => {
  const titles: Record<string, string> = locale === 'ru' ? {
    general: 'Настройки аккаунта',
    profile: 'Конструктор профиля',
    security: 'Безопасность',
    purchases: 'Покупки',
  } : {
    'general': 'General Settings',
    'profile': 'Profile Builder',
    'security': 'Security',
    'purchases': 'Purchases',
  }
  return titles[subpage] || (locale === 'ru' ? 'Аккаунт' : 'Account')
}

export async function generateMetadata(props: MetadataProps): Promise<Metadata> {
  const params = await props.params
  const locale = await serverLocale()
  const org = await getOrganizationContextInfo(params.orgslug, {
    revalidate: 120,
    tags: ['organizations'],
  })

  const title = `${getSubpageTitle(params.subpage, locale)} — ${org.name}`
  const description = locale === 'ru'
    ? `Настройки вашего аккаунта в ${org.name}`
    : `Manage your account settings at ${org.name}`

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      images: [
        {
          url: getOrgThumbnailMediaDirectory(org?.org_uuid, org?.thumbnail_image),
          width: 800,
          height: 600,
          alt: org.name,
        },
      ],
    },
  }
}

const AccountSubPage = async (props: { params: Promise<{ orgslug: string; subpage: string }> }) => {
  const params = await props.params
  const session = await getServerSession()

  if (!session) {
    redirect(`/login?redirect=/account/${params.subpage}`)
  }

  if (!VALID_SUBPAGES.includes(params.subpage)) {
    redirect('/account/general')
  }

  const org = await getOrganizationContextInfo(params.orgslug, {
    revalidate: 120,
    tags: ['organizations'],
  })

  return (
    <AccountClient
      orgslug={params.orgslug}
      org_id={org.id}
      subpage={params.subpage}
    />
  )
}

export default AccountSubPage
