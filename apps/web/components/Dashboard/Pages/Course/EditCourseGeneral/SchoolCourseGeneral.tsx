'use client'
import { useSchoolTranslation } from '@lib/school-i18n'

import { useCourseFieldSync } from '@components/Contexts/CourseContext'
import ThumbnailUpdate from './ThumbnailUpdate'

const input = 'block w-full mt-2 rounded-xl border border-neutral-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400'

export default function EditCourseGeneral({ orgslug }: { orgslug: string; course_uuid?: string }) {
  const { t: st } = useSchoolTranslation()
  const { syncChanges, courseStructure: course, isLoading } = useCourseFieldSync('editCourseGeneral')
  if (isLoading) return <p className="p-8">{st("Загружаем…")}</p>
  return <section className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
    <div><h2 className="text-2xl font-bold">{st("О курсе")}</h2><p className="text-sm text-neutral-500 mt-2">{st("Заполните карточку и нажмите «Сохранить» вверху. Заголовок, описание для поиска и превью создаются автоматически.")}</p></div>
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-5">
      <label className="block text-sm font-medium">{st("Название курса")}<input className={input} maxLength={100} required value={course.name || ''} onChange={e => syncChanges({ name: e.target.value }, true)} /></label>
      <label className="block text-sm font-medium">{st("Краткое описание")}<textarea className={input} maxLength={1000} rows={3} value={course.description || ''} onChange={e => syncChanges({ description: e.target.value }, true)} /></label>
      <label className="block text-sm font-medium">{st("Что изучаем и кому подходит")}<textarea className={input} rows={7} value={course.about || ''} onChange={e => syncChanges({ about: e.target.value }, true)} /></label>
      <div><h3 className="text-sm font-medium mb-2">{st("Обложка курса")}</h3><ThumbnailUpdate thumbnailType="both" /></div>
    </div>
  </section>
}
