'use client'
import { useSchoolTranslation } from '@lib/school-i18n'

import { useMyJournal } from '@/hooks/queries/useLearning'

const labels: Record<string, string> = { present: 'Был на занятии', absent: 'Пропуск', excused: 'Уважительная причина' }

export default function StudentJournal({ course }: { course: any }) {
  const { t: st } = useSchoolTranslation()
  const { data, error } = useMyJournal(course.course_uuid)
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
