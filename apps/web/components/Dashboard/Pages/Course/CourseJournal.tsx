'use client'
import { useSchoolTranslation } from '@lib/school-i18n'

import { FormEvent, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useCourse } from '@components/Contexts/CourseContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { learningRequest, courseLearningPath } from '@services/courses/learning'
import { lessonDateLabel } from '@/lib/learning'

const control = 'rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm'

function StudentRow({ student, record, lesson, course, token }: any) {
  const { t: st, i18n: schoolI18n } = useSchoolTranslation()
  const [status, setStatus] = useState(record?.status || '')
  const [grade, setGrade] = useState(record?.grade == null ? '' : String(record.grade))
  const [note, setNote] = useState(record?.note || '')
  const [busy, setBusy] = useState(false)
  const client = useQueryClient()
  async function save(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await learningRequest(`${courseLearningPath(course.course_uuid)}/lessons/${lesson.activity_uuid}/attendance/${student.id}`, token, 'PUT', { status, grade: grade === '' ? null : Number(grade), note })
      await client.invalidateQueries({ queryKey: ['school-journal', course.course_uuid] })
      await client.invalidateQueries({ queryKey: ['school-my-journal'] })
      await client.invalidateQueries({ queryKey: ['trail'] })
      toast.success(st("Отметка сохранена"))
    } catch (error) { toast.error((error as Error).message) }
    finally { setBusy(false) }
  }
  return <form onSubmit={save} className="grid sm:grid-cols-[1.2fr_1fr_90px_1fr_auto] gap-3 items-center border-b border-neutral-100 py-4 last:border-0">
    <div><p className="font-medium text-sm">{student.name}</p><p className="text-xs text-neutral-400 break-all">{student.email}</p></div>
    <select aria-label={st("Посещаемость: {{student_name}}", { student_name: student.name })} required value={status} onChange={e => setStatus(e.target.value)} className={control}>
      <option value="">{st("Не отмечено")}</option><option value="present">{st("Был на занятии")}</option><option value="absent">{st("Пропуск")}</option><option value="excused">{st("Уважительная причина")}</option>
    </select>
    <input aria-label={st("Оценка: {{student_name}}", { student_name: student.name })} type="number" min={0} max={100} step={1} value={grade} onChange={e => setGrade(e.target.value)} placeholder="0–100" className={`${control} w-full`} />
    <input aria-label={st("Комментарий: {{student_name}}", { student_name: student.name })} value={note} maxLength={1000} onChange={e => setNote(e.target.value)} placeholder={st("Комментарий")} className={`${control} min-w-0`} />
    <button disabled={busy || !status} className="rounded-lg bg-neutral-900 text-white px-4 py-2 text-sm disabled:opacity-40">{busy ? '…' : st("Сохранить")}</button>
  </form>
}

export default function CourseJournal() {
  const { t: st, i18n: schoolI18n } = useSchoolTranslation()
  const { courseStructure: course } = useCourse()
  const session = useLHSession() as any
  const token = session?.data?.tokens?.access_token
  const [selected, setSelected] = useState('')
  const lessons = course?.chapters?.flatMap((chapter: any) => chapter.activities || []) || []
  const lesson = lessons.find((lesson: any) => lesson.activity_uuid === selected) || lessons[0]
  const { data, error, isLoading } = useQuery({
    queryKey: ['school-journal', course?.course_uuid, session?.data?.user?.id],
    queryFn: () => learningRequest(`${courseLearningPath(course.course_uuid)}/journal`, token),
    enabled: !!token && !!course?.id,
  })
  return <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-5">
    <h2 className="text-2xl font-bold">{st("Журнал курса")}</h2>
    <p className="text-sm text-neutral-500">{st("Выберите занятие и отметьте студентов. «Был на занятии» засчитывает прохождение; пропуск — нет. Оценка от 0 до 100 сохраняется отдельно.")}</p>
    {lessons.length ? <label className="block text-sm font-medium">{st("Занятие")}<select className={`${control} mt-2 block w-full max-w-xl`} value={lesson?.activity_uuid || ''} onChange={e => setSelected(e.target.value)}>
      {lessons.map((lesson: any, index: number) => <option key={lesson.activity_uuid} value={lesson.activity_uuid}>{index + 1}. {lesson.name}</option>)}
    </select><span className="block text-xs text-neutral-500 mt-2">{lessonDateLabel(lesson?.extra_metadata?.bestdevs_lesson?.scheduled_at, course.extra_metadata?.bestdevs_learning?.timezone, schoolI18n.language)}</span></label>
      : <p className="text-neutral-500">{st("Добавьте занятия в план курса.")}</p>}
    {isLoading ? <p>{st("Загружаем студентов…")}</p> : error ? <p className="text-red-700">{st("Не удалось загрузить журнал. Проверьте права на курс.")}</p>
      : !data?.students?.length ? <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-500">{st("Зачисленных студентов пока нет. Одобрите заявки в разделе «Заявки на курсы».")}</div>
      : lesson && <section className="bg-white border border-neutral-200 rounded-2xl p-5">
        <div className="hidden sm:grid grid-cols-[1.2fr_1fr_90px_1fr_auto] gap-3 text-xs text-neutral-400 pb-2"><span>{st("Студент")}</span><span>{st("Посещаемость")}</span><span>{st("Оценка")}</span><span>{st("Комментарий")}</span><span className="w-24" /></div>
        {data.students.map((student: any) => {
          const record = data.attendance.find((entry: any) => entry.user_id === student.id && entry.activity_id === lesson.id)
          return <StudentRow key={`${lesson.activity_uuid}-${student.id}-${record?.update_date || ''}`} {...{ student, record, lesson, course, token }} />
        })}
      </section>}
  </div>
}
