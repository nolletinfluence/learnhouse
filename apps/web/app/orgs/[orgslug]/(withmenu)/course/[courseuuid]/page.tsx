import { automaticCourseSEO } from '@/lib/seo/course'
import React from 'react'
import CourseClient from './course'
import { getCourseMetadata } from '@services/courses/courses'
import { getOrganizationContextInfo } from '@services/organizations/orgs'
import { Metadata } from 'next'
import { getCourseThumbnailMediaDirectory, getOrgOgImageMediaDirectory } from '@services/media/media'
import { getServerSession } from '@/lib/auth/server'
import { getOrgSeoConfig, buildPageTitle } from '@/lib/seo/utils'
import { getServerCanonicalUrl } from '@/lib/seo/utils.server'


type MetadataProps = {
  params: Promise<{ orgslug: string; courseuuid: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(props: MetadataProps): Promise<Metadata> {
  const { courseuuid, orgslug } = await props.params
  const [org, course] = await Promise.all([
    getOrganizationContextInfo(orgslug, {}),
    getCourseMetadata(courseuuid, {}, undefined, { slim: true }).catch(() => null),
  ])
  const seo = automaticCourseSEO(course, org?.name || 'BestDevs')
  const canonical = await getServerCanonicalUrl(orgslug, `/course/${courseuuid}`)
  const image = course?.thumbnail_image
    ? getCourseThumbnailMediaDirectory(org.org_uuid, course.course_uuid, course.thumbnail_image)
    : '/empty_thumbnail.png'
  return {
    title: seo.title, description: seo.description,
    robots: { index: seo.index, follow: seo.index },
    alternates: { canonical },
    openGraph: { title: seo.title, description: seo.description, url: canonical, type: 'website',
      images: [{ url: image, width: 800, height: 600, alt: course?.name || 'BestDevs' }] },
    twitter: { card: 'summary_large_image', title: seo.title, description: seo.description, images: [image] },
  }
}

const CoursePage = async (params: any) => {
  const { courseuuid, orgslug } = await params.params
  return (
    <CourseClient
      courseuuid={courseuuid}
      orgslug={orgslug}
      course={null}
      serverError={null}
    />
  )
}

export default CoursePage
