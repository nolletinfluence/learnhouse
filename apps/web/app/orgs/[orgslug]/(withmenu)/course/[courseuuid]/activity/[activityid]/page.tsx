import { getActivityWithAuthHeader } from '@services/courses/activities'
import { getCourseMetadata } from '@services/courses/courses'
import ActivityClient from './activity'
import { getOrganizationContextInfo } from '@services/organizations/orgs'
import { getCourseThumbnailMediaDirectory, getOrgOgImageMediaDirectory } from '@services/media/media'
import { Metadata } from 'next'
import { getServerSession } from '@/lib/auth/server'
import { getOrgSeoConfig } from '@/lib/seo/utils'
import { getServerCanonicalUrl } from '@/lib/seo/utils.server'

type MetadataProps = {
  params: Promise<{ orgslug: string; courseuuid: string; activityid: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Занятие — BestDevs', robots: { index: false, follow: false } }
}

const ActivityPage = async (params: any) => {
  const activityid = (await params.params).activityid
  const courseuuid = (await params.params).courseuuid
  const orgslug = (await params.params).orgslug

  return (
    <ActivityClient
      activityid={activityid}
      courseuuid={courseuuid}
      orgslug={orgslug}
      activity={null}
      course={null}
    />
  )
}

export default ActivityPage
