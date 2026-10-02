'use client'
import { useSchoolTranslation } from '@lib/school-i18n'

import { useQuery } from '@tanstack/react-query'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { learningRequest, courseLearningPath } from '@services/courses/learning'

const labels: Record<string, string> = { present: 'Был на занятии', absent: 'Пропуск', excused: 'Уважительная причина' }

export default function StudentJournal({ course }: { course: any }) {
  const { t: st } = useSchoolTranslation()
  const session = useLHSession() as any
  const { data, error } = useQuery({
    queryKey: ['school-my-journal', course.course_uuid, session?.data?.user?.id],
    queryFn: () => learningRequest(`${courseLearningPath(course.course_uuid)}/my-journal`, session?.data?.tokens?.access_token),
    enabled: session.status === 'authenticated',
  })
  const lessons = course.chapters?.flatMap((chapter: any) => chapter.activities || []) || []
  return <section className="my-6 rounded-2xl border border-neutral-200 bg-white p-5">
    <h2 className="text-xl font-bold">{st("Посещаемость и оценки")}</h2>
    <p className="mt-2 mb-4 text-sm text-neutral-500">{st("Ментор отмечает посещаемость после занятия. Оценки — по шкале от 0 до 100.")}</p>
    {error ? <p className="text-sm text-red-700">{st("Не удалось загрузить журнал.")}</p> : !data ? <p className="text-sm text-neutral-400">{st("Загружаем…")}</p>
      : !data.length ? <p className="text-sm text-neutral-400">{st("Ментор пока не поставил отметки.")}</p>
      : <div className="space-y-3">{data.map((entry: any) => <div key={entry.id} className="flex flex-wrap gap-3 justify-between border-b border-neutral-100 pb-3 last:border-0">
        <div><p className="text-sm font-medium">{lessons.find((lesson: any) => lesson.id === entry.activity_id)?.name || st("Занятие")}</p><p className="text-xs text-neutral-500 mt-1">{st(labels[entry.status])}{entry.note ? ` · ${entry.note}` : ''}</p></div>
        <span className="text-sm font-semibold">{entry.grade == null ? st("Без оценки") : `${entry.grade} / 100`}</span>
      </div>)}</div>}
  </section>
}
