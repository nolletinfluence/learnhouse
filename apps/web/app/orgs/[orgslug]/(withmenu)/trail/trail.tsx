'use client'
import { useOrg } from '@components/Contexts/OrgContext'
import TrailCourseCard from '@components/Pages/Trail/TrailCourseCard'
import UserCertificates from '@components/Pages/Trail/UserCertificates'
import TypeOfContentTitle from '@components/Objects/StyledElements/Titles/TypeOfContentTitle'
import GeneralWrapperStyled from '@components/Objects/StyledElements/Wrappers/GeneralWrapper'
import { useTrail } from '@/hooks/queries/useTrail'
import React from 'react'
import { BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import FeatureGate from '@components/Dashboard/Shared/FeatureGate/FeatureGate'
import { useTrackView, AnalyticsEvent } from '@services/analytics'

function Trail(params: any) {
  const { t } = useTranslation()
  let orgslug = params.orgslug
  const org = useOrg() as any
  const orgID = org?.id

  const isCoursesEnabled = org?.config?.config?.resolved_features?.courses?.enabled ?? org?.config?.config?.features?.courses?.enabled !== false

  const { data: trail } = useTrail(isCoursesEnabled ? orgID : undefined)

  useTrackView(AnalyticsEvent.TrailViewed, { runs_count: trail?.runs?.length ?? 0 }, !!trail)

  return (
    <FeatureGate feature="courses" orgslug={orgslug} context="public">
    <GeneralWrapperStyled>
      <div className="flex flex-col space-y-2 mb-6">
        <div className="flex items-center justify-between">
          <TypeOfContentTitle title={t('courses.progress')} type="tra" />

        </div>

        {!trail ? (
          <div className="animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden">
                  <div className="bg-gray-200 w-full h-40 rounded-xl" />
                  <div className="pt-3 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-2 bg-gray-200 rounded-full w-full" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : trail.runs.length === 0 ? (
          <div className="col-span-full flex flex-col justify-center items-center py-12 px-4 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/30">
            <div className="p-4 bg-white rounded-full nice-shadow mb-4">
              <BookOpen className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
            </div>
            <h1 className="text-xl font-bold text-gray-600 mb-2">
              {t('user.no_courses_in_progress')}
            </h1>
            <p className="text-md text-gray-400 mb-6 text-center max-w-xs">
              {t('user.start_course_to_see_progress')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {trail.runs.map((run: any) => (
              <TrailCourseCard
                key={run.course.course_uuid}
                run={run}
                course={run.course}
                orgslug={orgslug}
              />
            ))}
          </div>
        )}
      </div>

      <UserCertificates orgslug={orgslug} />
    </GeneralWrapperStyled>
    </FeatureGate>
  )
}

export default Trail
