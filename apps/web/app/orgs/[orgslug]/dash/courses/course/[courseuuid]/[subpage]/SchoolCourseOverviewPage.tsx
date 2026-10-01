'use client'
import { use, useEffect } from 'react'
import { Info, CalendarDays, Users, ClipboardList, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { CourseProvider } from '@components/Contexts/CourseContext'
import { CourseOverviewTop } from '@components/Dashboard/Misc/CourseOverviewTop'
import EditCourseStructure from '@components/Dashboard/Pages/Course/EditCourseStructure/EditCourseStructure'
import EditCourseGeneral from '@components/Dashboard/Pages/Course/EditCourseGeneral/EditCourseGeneral'
import EditCourseContributors from '@components/Dashboard/Pages/Course/EditCourseContributors/EditCourseContributors'
import CourseJournal from '@components/Dashboard/Pages/Course/CourseJournal'
import { useCourseRights } from '@hooks/useCourseRights'
import { getUriWithOrg } from '@services/config/config'
import { DashTabBar } from '@components/Dashboard/Shared/DashTabBar/DashTabBar'

export type CourseOverviewParams = { orgslug: string; courseuuid: string; subpage: string }

export default function CourseOverviewPage({ params: promise }: { params: Promise<CourseOverviewParams> }) {
  const params = use(promise)
  const router = useRouter()
  const courseuuid = `course_${params.courseuuid}`
  const { hasPermission, isLoading } = useCourseRights(courseuuid)
  const tabs = [
    { key: 'content', label: 'План занятий', icon: CalendarDays, permission: 'update_content' as const },
    { key: 'general', label: 'О курсе', icon: Info, permission: 'update' as const },
    { key: 'journal', label: 'Посещаемость и оценки', icon: ClipboardList, permission: 'update' as const },
    { key: 'contributors', label: 'Менторы', icon: Users, permission: 'manage_contributors' as const },
  ].filter(tab => hasPermission(tab.permission))
  useEffect(() => {
    if (!isLoading && tabs.length && !tabs.some(tab => tab.key === params.subpage)) {
      router.replace(getUriWithOrg(params.orgslug, `/dash/courses/course/${params.courseuuid}/${tabs[0].key}`))
    }
  }, [isLoading, tabs, params, router])
  if (!isLoading && !tabs.length) return <div className="p-12 text-center"><Lock size={36} className="mx-auto mb-3" /><h1 className="text-xl font-bold">Нет доступа к редактированию курса</h1></div>
  return <div className="bestdevs-course-page h-screen w-full bg-[#f8f8f8] grid grid-rows-[auto_1fr] grid-cols-1">
    <CourseProvider courseuuid={courseuuid} withUnpublishedActivities>
      <div className="bestdevs-course-header px-4 sm:px-8 bg-white border-b min-w-0 overflow-hidden">
        <CourseOverviewTop params={params} />
        <DashTabBar tabs={tabs.map(tab => ({ key: tab.key, label: tab.label, icon: <tab.icon size={16} />,
          href: getUriWithOrg(params.orgslug, `/dash/courses/course/${params.courseuuid}/${tab.key}`), active: tab.key === params.subpage }))} />
      </div>
      <div className="bestdevs-course-content h-full overflow-y-auto overflow-x-hidden">
        {isLoading ? <p className="p-8 text-neutral-400">Загружаем курс…</p> : <>
          {params.subpage === 'content' && hasPermission('update_content') && <EditCourseStructure orgslug={params.orgslug} />}
          {/* <EditCourseSEO orgslug={params.orgslug} /> */}
          {params.subpage === 'general' && hasPermission('update') && <EditCourseGeneral orgslug={params.orgslug} />}
          {params.subpage === 'journal' && hasPermission('update') && <CourseJournal />}
          {params.subpage === 'contributors' && hasPermission('manage_contributors') && <EditCourseContributors orgslug={params.orgslug} />}
        </>}
      </div>
    </CourseProvider>
  </div>
}
