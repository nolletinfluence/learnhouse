'use client'
import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Plus, Pencil, BookOpen, Trash2, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useCourse, useCourseDispatch } from '@components/Contexts/CourseContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { learningRequest, courseLearningPath } from '@services/courses/learning'
import { getCourseMetadata } from '@services/courses/courses'
import { getUriWithOrg, getAPIUrl } from '@services/config/config'
import { RequestBodyWithAuthHeader } from '@services/utils/ts/requests'
import { courseMonths, DEFAULT_LEARNING_SETTINGS, lessonDateISO, lessonDateInput, lessonDateLabel } from '@/lib/learning'

export type OrderPayload = { chapter_order_by_ids: Array<{ chapter_id: string; activities_order_by_ids: Array<{ activity_id: string }> }> } | undefined
const inputClass = 'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400'

export default function EditCourseStructure({ orgslug }: { orgslug: string; course_uuid?: string }) {
  const state = useCourse()
  const dispatch = useCourseDispatch()
  const course = state.courseStructure
  const session = useLHSession() as any
  const token = session?.data?.tokens?.access_token
  const client = useQueryClient()
  const [settingsDraft, setSettingsDraft] = useState<any>(null)
  const settings = settingsDraft || { ...DEFAULT_LEARNING_SETTINGS, ...course?.extra_metadata?.bestdevs_learning }
  const [form, setForm] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [deleteLesson, setDeleteLesson] = useState<any>(null)
  const chapters = course?.chapters || []
  const count = chapters.reduce((sum: number, chapter: any) => sum + chapter.activities.length, 0)

  async function refresh() {
    const data = await getCourseMetadata(course.course_uuid.replace(/^course_/, ''), {}, token, { withUnpublishedActivities: true })
    dispatch({ type: 'syncFromServer', payload: { data, timestamp: Date.now() } })
    await client.invalidateQueries({ queryKey: ['course'] })
    await client.invalidateQueries({ queryKey: ['school-calendar'] })
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await learningRequest(`${courseLearningPath(course.course_uuid)}/settings`, token, 'PUT', settings)
      await refresh()
      setSettingsDraft(null)
      toast.success('Параметры курса сохранены')
    } catch (error) { toast.error((error as Error).message) }
    finally { setBusy(false) }
  }

  function openLesson(month: number, chapter?: any, lesson?: any) {
    const metadata = lesson?.extra_metadata?.bestdevs_lesson || {}
    setForm({ month, chapter_id: chapter?.id || null, activity_uuid: lesson?.activity_uuid,
      name: lesson?.name || '', local_date: lessonDateInput(metadata.scheduled_at, settings.timezone),
      duration_minutes: metadata.duration_minutes || 90, location: metadata.location || '', published: lesson?.published ?? true })
  }

  async function saveLesson(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      const { local_date, activity_uuid, ...payload } = form
      await learningRequest(`${courseLearningPath(course.course_uuid)}/lessons${activity_uuid ? `/${activity_uuid}` : ''}`, token,
        activity_uuid ? 'PUT' : 'POST', { ...payload, scheduled_at: lessonDateISO(local_date, settings.timezone) })
      await refresh()
      setForm(null)
      toast.success('Занятие сохранено')
    } catch (error) { toast.error((error as Error).message) }
    finally { setBusy(false) }
  }

  async function removeLesson() {
    setBusy(true)
    try {
      const response = await fetch(`${getAPIUrl()}activities/${deleteLesson.activity_uuid}`, RequestBodyWithAuthHeader('DELETE', null, null, token))
      if (!response.ok) throw new Error('Не удалось удалить занятие')
      await refresh()
      setDeleteLesson(null)
      toast.success('Занятие удалено')
    } catch (error) { toast.error((error as Error).message) }
    finally { setBusy(false) }
  }

  if (state.isLoading) return <p className="p-8 text-neutral-500">Загружаем план курса…</p>
  const months = courseMonths(chapters, settings.duration_months)

  return <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
    <div><h2 className="text-2xl font-bold">План занятий</h2><p className="text-sm text-neutral-500 mt-2">Выберите месяц, добавьте тему и назначьте дату. Материалы открываются по кнопке «Материалы».</p></div>
    <form onSubmit={saveSettings} className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <label className="text-sm font-medium">Продолжительность<select className={`${inputClass} mt-2`} value={settings.duration_months} onChange={e => setSettingsDraft({ ...settings, duration_months: Number(e.target.value) })}>
          {[4, 6, 12].map(months => <option key={months} value={months}>{months} {months === 4 ? 'месяца' : 'месяцев'}</option>)}</select></label>
        <label className="text-sm font-medium">Занятий в месяц<input className={`${inputClass} mt-2`} type="number" min={1} max={62} required value={settings.lessons_per_month} onChange={e => setSettingsDraft({ ...settings, lessons_per_month: Number(e.target.value) })} /></label>
        <label className="text-sm font-medium">Часовой пояс<select className={`${inputClass} mt-2`} value={settings.timezone} onChange={e => setSettingsDraft({ ...settings, timezone: e.target.value })}>
          {Array.from(new Set(['Asia/Bishkek', 'Asia/Almaty', 'Europe/Moscow', 'UTC', settings.timezone])).map(zone => <option key={zone}>{zone}</option>)}</select></label>
      </div>
      <div className="grid sm:grid-cols-[1fr_130px_auto] gap-4 items-end">
        <label className="text-sm font-medium">Стоимость всего курса<input className={`${inputClass} mt-2`} type="number" min={0} step="0.01" placeholder="Уточняется" value={settings.price ?? ''} onChange={e => setSettingsDraft({ ...settings, price: e.target.value === '' ? null : e.target.value })} /></label>
        <label className="text-sm font-medium">Валюта<select className={`${inputClass} mt-2`} value={settings.currency} onChange={e => setSettingsDraft({ ...settings, currency: e.target.value })}>{['KGS', 'USD', 'RUB'].map(currency => <option key={currency}>{currency}</option>)}</select></label>
        <button disabled={busy} className="rounded-xl bg-neutral-900 text-white px-5 py-3 text-sm font-semibold disabled:opacity-50">Сохранить параметры</button>
      </div>
      <p className="text-xs text-neutral-500">План: {settings.duration_months * settings.lessons_per_month} занятий · Добавлено: {count}. Изменение срока сохраняет существующие занятия.</p>
    </form>
    <div className="space-y-4">{months.map(({ number, chapter }) => <section key={number} className="rounded-2xl bg-white border border-neutral-200 overflow-hidden">
      <div className="flex flex-wrap justify-between gap-3 items-center p-5 bg-neutral-50/70 border-b border-neutral-100">
        <div><h3 className="font-bold">Месяц {number}{chapter && chapter.name !== `Месяц ${number}` ? ` · ${chapter.name}` : ''}</h3><p className="text-xs text-neutral-500 mt-1">{chapter?.activities?.length || 0} из {settings.lessons_per_month} запланированных занятий</p></div>
        <button disabled={busy} onClick={() => openLesson(number, chapter)} className="flex gap-2 items-center rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-semibold"><Plus size={17} />Добавить занятие</button>
      </div>
      {chapter?.activities?.length ? chapter.activities.map((lesson: any, index: number) => <div key={lesson.activity_uuid} className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-4 border-b border-neutral-100 last:border-0">
        <span className="w-9 h-9 shrink-0 rounded-xl bg-neutral-100 flex items-center justify-center text-sm font-semibold">{index + 1}</span>
        <div className="flex-1 min-w-[160px]"><p className="font-medium text-sm">{lesson.name}</p><p className="text-xs text-neutral-500 mt-1 flex items-center gap-1.5"><CalendarDays size={13} />{lessonDateLabel(lesson.extra_metadata?.bestdevs_lesson?.scheduled_at, settings.timezone)}</p>
          <p className="text-xs mt-1 text-neutral-400">{lesson.published ? 'Видно зачисленным студентам' : 'Черновик'}{lesson.extra_metadata?.bestdevs_lesson?.location ? ` · ${lesson.extra_metadata.bestdevs_lesson.location}` : ''}</p></div>
        <Link href={getUriWithOrg(orgslug, `/course/${course.course_uuid.replace(/^course_/, '')}/activity/${lesson.activity_uuid.replace(/^activity_/, '')}/edit`)} className="flex gap-1.5 items-center text-sm px-3 py-2 rounded-lg border border-neutral-200"><BookOpen size={15} />Материалы</Link>
        <button aria-label={`Редактировать ${lesson.name}`} onClick={() => openLesson(number, chapter, lesson)} className="p-2.5 rounded-lg hover:bg-neutral-100"><Pencil size={16} /></button>
        <button aria-label={`Удалить ${lesson.name}`} onClick={() => setDeleteLesson(lesson)} className="p-2.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
      </div>) : <p className="p-5 text-sm text-neutral-400">Занятий пока нет. Добавьте первое — оно появится здесь и в календаре.</p>}
    </section>)}</div>
    {form && <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4" onClick={() => !busy && setForm(null)}>
      <form onSubmit={saveLesson} role="dialog" aria-modal="true" aria-labelledby="lesson-title" className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center"><h3 id="lesson-title" className="text-xl font-bold">{form.activity_uuid ? 'Редактировать занятие' : 'Новое занятие'} · Месяц {form.month}</h3><button type="button" aria-label="Закрыть" disabled={busy} onClick={() => setForm(null)}><X size={20} /></button></div>
        <label className="block text-sm font-medium">Тема занятия<input autoFocus required maxLength={200} className={`${inputClass} mt-2`} value={form.name} placeholder="Например: HTML и структура страницы" onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label className="block text-sm font-medium">Дата и время · {settings.timezone}<input type="datetime-local" className={`${inputClass} mt-2`} value={form.local_date} onChange={e => setForm({ ...form, local_date: e.target.value })} /></label>
        <div className="grid grid-cols-2 gap-4"><label className="text-sm font-medium">Длительность, минут<input type="number" required min={15} max={480} className={`${inputClass} mt-2`} value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} /></label>
          <label className="text-sm font-medium">Место или ссылка<input maxLength={300} className={`${inputClass} mt-2`} value={form.location} placeholder="Аудитория / Zoom" onChange={e => setForm({ ...form, location: e.target.value })} /></label></div>
        <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} />Показывать зачисленным студентам</label>
        <button disabled={busy} className="w-full p-3 rounded-xl bg-neutral-900 text-white font-semibold disabled:opacity-50">{busy ? 'Сохраняем…' : 'Сохранить занятие'}</button>
      </form>
    </div>}
    {deleteLesson && <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-label="Удаление занятия" className="max-w-md w-full rounded-2xl p-6 bg-white space-y-4"><h3 className="text-lg font-bold">Удалить «{deleteLesson.name}»?</h3><p className="text-sm text-neutral-500">Материалы, посещаемость и оценки этого занятия будут удалены.</p><div className="flex gap-3"><button disabled={busy} onClick={() => setDeleteLesson(null)} className="flex-1 rounded-xl border p-3">Отмена</button><button disabled={busy} onClick={removeLesson} className="flex-1 rounded-xl bg-red-600 text-white p-3">Удалить</button></div></div></div>}
  </div>
}
