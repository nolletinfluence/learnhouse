'use client'
import { useSchoolTranslation } from '@lib/school-i18n'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarDays, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { learningRequest } from '@services/courses/learning'
import { getUriWithOrg } from '@services/config/config'
import { lessonDateInput, lessonDateLabel } from '@/lib/learning'

export default function LearningCalendar({ dashboard = false }: { dashboard?: boolean }) {
  const { t: st, i18n: schoolI18n } = useSchoolTranslation()
  const org = useOrg() as any
  const session = useLHSession() as any
  const today = new Date()
  const todayLocal = new Date(`${lessonDateInput(today.toISOString()).slice(0, 10)}T12:00:00`)
  const [month, setMonth] = useState(() => new Date(todayLocal.getFullYear(), todayLocal.getMonth(), 1))
  const [selected, setSelected] = useState('')
  const [filter, setFilter] = useState('')
  const token = session?.data?.tokens?.access_token
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['school-calendar', org?.id, session?.data?.user?.id],
    queryFn: () => learningRequest(`orgs/${org.id}/calendar`, token),
    enabled: !!org?.id && !!token,
  })
  const lessons: any[] = (data || []).filter((lesson: any) => !filter || lesson.course_uuid === filter)
    .sort((a: any, b: any) => a.scheduled_at.localeCompare(b.scheduled_at))
  const courseOptions = [...new Map<string, string>((data || []).map((lesson: any) => [lesson.course_uuid, lesson.course_name])).entries()]
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const offset = (month.getDay() + 6) % 7
  const dayKey = (day: number) => `${monthKey}-${String(day).padStart(2, '0')}`
  const onDay = (date: string) => lessons.filter(lesson => lessonDateInput(lesson.scheduled_at, lesson.timezone).slice(0, 10) === date)
  const shown = selected ? onDay(selected) : lessons.filter(lesson => lessonDateInput(lesson.scheduled_at, lesson.timezone).startsWith(monthKey))
  const todayKey = lessonDateInput(today.toISOString()).slice(0, 10)
  const changeMonth = (delta: number) => { setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1)); setSelected('') }
  if (session.status === 'loading') return <p className="p-8">{st("Загружаем…")}</p>
  if (session.status !== 'authenticated') return <div className="p-8"><h1 className="text-xl font-bold mb-4">{st("Войдите, чтобы увидеть расписание")}</h1><Link className="underline" href={getUriWithOrg(org?.slug, '/login')}>{st("Войти")}</Link></div>
  return <main className="max-w-6xl mx-auto p-4 sm:p-8 w-full space-y-6">
    <header className="flex flex-wrap items-center gap-4 justify-between"><div><h1 className="text-2xl font-bold flex gap-3 items-center"><CalendarDays size={25} />{st("Календарь занятий")}</h1><p className="text-sm text-neutral-500 mt-2">{dashboard ? st("Расписание курсов и быстрый переход в журнал.") : st("Занятия курсов, на которые вы зачислены.")}</p></div>
      <select aria-label={st("Курс")} value={filter} onChange={e => { setFilter(e.target.value); setSelected('') }} className="border rounded-xl px-4 py-3 text-sm bg-white max-w-full"><option value="">{st("Все курсы")}</option>{courseOptions.map(([uuid, name]: any) => <option key={uuid} value={uuid}>{name}</option>)}</select>
    </header>
    {error ? <div role="alert" className="rounded-xl bg-red-50 text-red-700 p-4">{st("Не удалось загрузить расписание.")} <button onClick={() => refetch()} className="underline">{st("Повторить")}</button></div> : null}
    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
      <section className="rounded-2xl bg-white border border-neutral-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-bold capitalize">{month.toLocaleDateString(schoolI18n.language, { month: 'long', year: 'numeric' })}</h2><div className="flex gap-1"><button aria-label={st("Предыдущий месяц")} onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-neutral-100"><ChevronLeft size={20} /></button><button onClick={() => { setMonth(new Date(todayLocal.getFullYear(), todayLocal.getMonth(), 1)); setSelected('') }} className="text-sm px-2">{st("Сегодня")}</button><button aria-label={st("Следующий месяц")} onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-neutral-100"><ChevronRight size={20} /></button></div></div>
        <div className="grid grid-cols-7 text-center text-xs text-neutral-400 mb-2">{[st("Пн"), st("Вт"), st("Ср"), st("Чт"), st("Пт"), st("Сб"), st("Вс")].map(day => <span key={day}>{day}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">{Array.from({ length: offset }).map((_, index) => <div key={`empty-${index}`} />)}{Array.from({ length: days }, (_, index) => {
          const date = dayKey(index + 1), events = onDay(date)
          return <button key={date} onClick={() => setSelected(date)} aria-label={st("{{date}}: {{events_length}} занятий", { date: date, events_length: events.length })} aria-pressed={selected === date}
            className={`min-h-16 sm:min-h-24 p-1.5 sm:p-2 rounded-xl text-start border transition-colors ${selected === date ? 'border-lime-500 bg-lime-50' : 'border-neutral-100 hover:bg-neutral-50'} ${todayKey === date ? 'font-bold' : ''}`}>
            <span className={`text-sm ${todayKey === date ? 'text-lime-700' : ''}`}>{index + 1}</span>
            {events.slice(0, 2).map(lesson => <span key={lesson.activity_uuid} className="hidden sm:block text-[10px] truncate mt-1 rounded bg-lime-100 px-1 py-0.5">{lessonDateInput(lesson.scheduled_at, lesson.timezone).slice(11)} {lesson.name}</span>)}
            {!!events.length && <span className="sm:hidden block mt-2 w-1.5 h-1.5 rounded-full bg-lime-500" />}
            {events.length > 2 && <span className="hidden sm:block text-[10px] text-neutral-400 mt-1">{st("Ещё")} {events.length - 2}</span>}
          </button>
        })}</div>
      </section>
      <section className="rounded-2xl bg-white border border-neutral-200 p-5"><div className="flex justify-between items-center mb-4"><h2 className="font-bold">{selected ? st("Занятия за день") : st("Занятия за месяц")}</h2>{selected && <button className="text-xs underline" onClick={() => setSelected('')}>{st("Весь месяц")}</button>}</div>
        {isLoading ? <p className="text-neutral-400 text-sm">{st("Загружаем расписание…")}</p> : !shown.length ? <p className="text-sm text-neutral-400">{st("На этот период занятий нет.")}{dashboard ? ` ${st("Назначьте даты в плане курса.")}` : ` ${st("Расписание появится после зачисления и назначения дат ментором.")}`}</p>
          : <div className="space-y-4">{shown.map(lesson => <article key={lesson.activity_uuid} className="pb-4 border-b border-neutral-100 last:border-0"><p className="text-xs text-lime-700 font-semibold">{lessonDateLabel(lesson.scheduled_at, lesson.timezone, schoolI18n.language)} · {lesson.duration_minutes}  {st("мин.")}</p><h3 className="font-semibold text-sm mt-1">{lesson.name}</h3><p className="text-xs text-neutral-500 mt-1">{lesson.course_name}</p>{lesson.location && <p className="text-xs text-neutral-500 mt-1 break-words">{lesson.location}</p>}
            <Link className="inline-flex items-center gap-1.5 text-xs font-semibold mt-2" href={getUriWithOrg(org.slug, dashboard ? `/dash/courses/course/${lesson.course_uuid.replace(/^course_/, '')}/journal` : `/course/${lesson.course_uuid.replace(/^course_/, '')}/activity/${lesson.activity_uuid.replace(/^activity_/, '')}`)}>{dashboard ? st("Открыть журнал") : st("Открыть занятие")}<ArrowRight size={13} /></Link>
          </article>)}</div>}
      </section>
    </div>
  </main>
}
