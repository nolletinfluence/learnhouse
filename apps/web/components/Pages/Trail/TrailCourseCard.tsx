'use client'

import Link from 'next/link'
import { ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import { getUriWithOrg } from '@services/config/config'
import { getCourseThumbnailMediaDirectory } from '@services/media/media'
import { useSchoolTranslation } from '@/lib/school-i18n'
import { resumeActivity } from '@/lib/student-experience'
import LearningProgress from './LearningProgress'

interface TrailCourseCardProps {
  course: any
  run: any
  orgslug: string
  selected?: boolean
  onSelect?: () => void
}

export default function TrailCourseCard({ course, run, orgslug, selected, onSelect }: TrailCourseCardProps) {
  const { t: st } = useSchoolTranslation()
  const org = useOrg() as any
  const courseId = course.course_uuid.replace(/^course_/, '')
  const next = resumeActivity(course, run)
  const courseLink = getUriWithOrg(orgslug, `/course/${courseId}`)
  const destination = next ? `${courseLink}/activity/${next === 'end' ? 'end' : next.activity_uuid.replace(/^activity_/, '')}` : courseLink
  return <article className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white ${selected ? 'border-neutral-900' : 'border-neutral-200'}`}>
    <Link href={courseLink} className="relative block aspect-[2.5/1] bg-neutral-50">
      {course.thumbnail_image && org?.org_uuid ? <img alt="" className="h-full w-full object-cover"
        src={getCourseThumbnailMediaDirectory(org.org_uuid, course.course_uuid, course.thumbnail_image)} />
        : <div className="flex h-full items-center justify-center text-neutral-300"><BookOpen size={32} /></div>}
    </Link>
    <div className="flex flex-1 flex-col gap-4 p-4">
      <Link href={courseLink} className="break-words text-base font-bold leading-snug text-neutral-900">{course.name}</Link>
      {course.published === false ? <p className="text-sm text-neutral-500">{st('Курс временно недоступен. Обратитесь к администратору школы.')}</p> : <LearningProgress course={course} run={run} compact />}
      <div className="mt-auto space-y-2">
        {course.published !== false && <Link href={destination} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-center text-sm font-semibold hover:bg-neutral-200">
          {next === 'end' ? <><CheckCircle2 size={16} />{st('Итоги курса')}</> : <>{st(next ? 'Продолжить обучение' : 'Открыть курс')}<ArrowRight size={16} className="shrink-0" /></>}
        </Link>}
        {onSelect && <button type="button" aria-pressed={selected} onClick={onSelect}
          className="min-h-11 w-full rounded-xl px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50">{st(selected ? 'Выбранный курс' : 'Прогресс и обратная связь')}</button>}
      </div>
    </div>
  </article>
}
