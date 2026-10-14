'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, CalendarDays, MessageCircle, Settings, Trophy } from 'lucide-react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { getUriWithOrg } from '@services/config/config'
import { useTrail } from '@/hooks/queries/useTrail'
import { useLearningCalendar, useMyJournal, useMyApplications } from '@/hooks/queries/useLearning'
import { useSchoolTranslation } from '@/lib/school-i18n'
import { activeLearningRuns, courseLessons, nextScheduledLesson, resumeActivity, meetingLink } from '@/lib/student-experience'
import { lessonDateLabel } from '@/lib/learning'
import { useTrackView, AnalyticsEvent } from '@services/analytics'
import LearningProgress, { LessonLearningBadge } from './LearningProgress'
import TrailCourseCard from './TrailCourseCard'
import UserCertificates from './UserCertificates'

const ACTION_STYLE = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-center text-sm font-semibold'

export default function StudentLearningHome({ orgslug, progressPage = false }: { orgslug: string; progressPage?: boolean }) {
  const { t: st, i18n } = useSchoolTranslation()
  const org = useOrg() as any
  const session = useLHSession() as any
  const user = session?.data?.user
  const { data: trail, isLoading, error, refetch } = useTrail(org?.id)
  const calendar = useLearningCalendar()
  const applications = useMyApplications()
  const runs = activeLearningRuns(trail)
  const [selectedUuid, setSelectedUuid] = useState('')
  const overviewRef = useRef<HTMLDivElement>(null)
  const selected = runs.find(run => run.course.course_uuid === selectedUuid) || runs[0]
  const course = selected?.course
  const available = !!course && course.published !== false
  const journal = useMyJournal(course?.course_uuid, available)
  const next = resumeActivity(course, selected)
  const upcoming = nextScheduledLesson(calendar.data || [], runs)
  const feedback = (journal.data || []).filter(entry => entry.note || entry.grade != null)
    .slice().sort((a, b) => (Date.parse(b.update_date) || 0) - (Date.parse(a.update_date) || 0))[0]
  const lessons = courseLessons(course, selected)
  const feedbackLesson = lessons.find(lesson => lesson.id === feedback?.activity_id)
  const coursePath = course ? `/course/${course.course_uuid.replace(/^course_/, '')}` : ''
  const resumePath = next ? `${coursePath}/activity/${next === 'end' ? 'end' : next.activity_uuid.replace(/^activity_/, '')}` : coursePath
  useTrackView(AnalyticsEvent.TrailViewed, { runs_count: runs.length }, !!trail)

  if (session.status === 'loading' || isLoading) return <div role="status" className="animate-pulse space-y-4 py-4">
    <span className="sr-only">{st('Загружаем обучение…')}</span>
    <div className="h-8 w-48 rounded-xl bg-neutral-200" /><div className="h-64 rounded-2xl bg-neutral-200" />
  </div>
  if (session.status !== 'authenticated') return <section className="rounded-2xl border border-neutral-200 bg-white p-6">
    <h1 className="text-2xl font-bold">{st('Моё обучение')}</h1>
    <p className="my-4 text-neutral-600">{st('Войдите, чтобы продолжить обучение и увидеть свой прогресс.')}</p>
    <Link className={`${ACTION_STYLE} bg-neutral-900 text-white`} href={getUriWithOrg(orgslug, '/login') + `?next=${encodeURIComponent(getUriWithOrg(orgslug, progressPage ? '/trail' : '/account'))}`}>{st('Войти')}</Link>
  </section>
  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><h1 className="text-2xl font-bold tracking-tight text-neutral-900">{st(progressPage ? 'Мой прогресс' : 'Моё обучение')}</h1>
        <p className="mt-2 break-words text-sm text-neutral-500">{st('Здравствуйте, {{name}}!', { name: user?.first_name || user?.username || st('студент') })} {st('Здесь ваш следующий шаг и результат обучения.')}</p>
      </div>
      <Link href={getUriWithOrg(orgslug, '/account/general')} className={`${ACTION_STYLE} text-neutral-600 hover:bg-neutral-100`}><Settings size={17} />{st('Настройки')}</Link>
    </header>
    {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
      <p>{st('Не удалось загрузить обучение. Ваш прогресс сохранён.')}</p>
      <button onClick={() => refetch()} className={`${ACTION_STYLE} mt-3 bg-white`}>{st('Повторить')}</button>
    </div> : !runs.length ? applications.isLoading ? <p role="status" className="rounded-2xl bg-white p-6 text-sm text-neutral-500">{st('Проверяем ваши заявки…')}</p> : applications.error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
      {st('Не удалось загрузить заявки.')} <button onClick={() => applications.refetch()} className={`${ACTION_STYLE} bg-white`}>{st('Повторить')}</button>
    </div> : applications.data?.length ? null : <section className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
      <BookOpen size={28} className="mb-4 text-neutral-400" /><h2 className="text-xl font-bold">{st('Начнём обучение')}</h2>
      <p className="my-4 max-w-xl text-sm leading-relaxed text-neutral-500">{st('Выберите курс и отправьте заявку. После одобрения здесь появятся занятия, прогресс и обратная связь ментора.')}</p>
      <Link href={getUriWithOrg(orgslug, '/courses')} className={`${ACTION_STYLE} bg-neutral-900 text-white`}>{st('Выбрать курс')}<ArrowRight size={17} /></Link>
    </section> : <>
      <div ref={overviewRef} className="grid min-w-0 scroll-mt-28 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7">
          {runs.length > 1 && <label className="mb-5 block text-xs font-semibold text-neutral-500">{st('Ваш курс')}
            <select value={course.course_uuid} onChange={event => setSelectedUuid(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900">
              {runs.map(run => <option key={run.id} value={run.course.course_uuid}>{run.course.name}</option>)}
            </select>
          </label>}
          <div className="mb-5 flex items-start gap-3"><div className="rounded-xl bg-lime-100 p-3 text-lime-900">{next === 'end' ? <Trophy size={22} /> : <BookOpen size={22} />}</div>
            <div className="min-w-0"><p className="text-sm font-medium text-neutral-500">{st(next === 'end' ? 'Курс завершён' : 'Следующий шаг')}</p><h2 className="mt-1 break-words text-xl font-bold leading-snug">{course.name}</h2></div>
          </div>
          {available ? <>
            {next && next !== 'end' && <div className="mb-5"><p className="text-sm text-neutral-500">{st(selected.data?.bestdevs_learning?.last_activity_uuid === next.activity_uuid ? 'Вы остановились здесь' : 'Следующее занятие')}</p>
              <p className="mt-1 break-words font-semibold">{next.name}</p><div className="mt-2"><LessonLearningBadge run={selected} activityId={next.id} /></div>
            </div>}
            <Link href={getUriWithOrg(orgslug, resumePath)} className={`${ACTION_STYLE} mb-6 w-full bg-neutral-900 text-white hover:bg-neutral-800 sm:w-auto`}>
              {st(next === 'end' ? 'Итоги курса' : next ? 'Продолжить обучение' : 'Открыть курс')}<ArrowRight size={18} className="shrink-0" />
            </Link>
            <LearningProgress course={course} run={selected} />
          </> : <p className="text-sm text-neutral-500">{st('Курс временно недоступен. Обратитесь к администратору школы.')}</p>}
        </section>
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="flex items-center gap-2 font-bold"><CalendarDays size={19} />{st('Ближайшее занятие')}</h2>
            {calendar.isLoading ? <p className="mt-3 text-sm text-neutral-500">{st('Загружаем расписание…')}</p> : calendar.error ? <div role="alert" className="mt-3 text-sm text-neutral-600">{st('Не удалось загрузить расписание.')} <button onClick={() => calendar.refetch()} className="min-h-11 font-semibold underline">{st('Повторить')}</button></div>
              : upcoming ? <div className="mt-3 space-y-2"><p className="text-sm font-medium text-emerald-700">{lessonDateLabel(upcoming.scheduled_at, upcoming.timezone, i18n.language)} · {upcoming.timezone}</p>
                <p className="break-words font-semibold">{upcoming.name}</p><p className="break-words text-sm text-neutral-500">{upcoming.course_name}</p>
                {upcoming.location && !meetingLink(upcoming.location) && <p className="break-words text-sm text-neutral-600">{upcoming.location}</p>}
                {meetingLink(upcoming.location || '') && <a className={`${ACTION_STYLE} w-full bg-lime-100 text-lime-950 hover:bg-lime-200`} href={meetingLink(upcoming.location)!} target="_blank" rel="noopener noreferrer">{st('Подключиться к занятию')}<ArrowRight size={16} /></a>}
                <Link className={`${ACTION_STYLE} w-full bg-neutral-100`} href={getUriWithOrg(orgslug, `/course/${upcoming.course_uuid.replace(/^course_/, '')}/activity/${upcoming.activity_uuid.replace(/^activity_/, '')}`)}>{st('Материалы занятия')}<ArrowRight size={16} /></Link>
              </div> : <p className="mt-3 text-sm leading-relaxed text-neutral-500">{st('Ближайших занятий пока нет. Новые даты появятся, когда ментор добавит их в расписание.')}</p>}
            <Link className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-neutral-600" href={getUriWithOrg(orgslug, '/calendar')}>{st('Всё расписание')}<ArrowRight size={15} /></Link>
          </section>
          {available && <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="flex items-center gap-2 font-bold"><MessageCircle size={19} />{st('Обратная связь ментора')}</h2>
            {journal.isLoading ? <p className="mt-3 text-sm text-neutral-500">{st('Загружаем…')}</p> : journal.error ? <div role="alert" className="mt-3 text-sm text-neutral-600">{st('Не удалось загрузить обратную связь.')} <button onClick={() => journal.refetch()} className="min-h-11 font-semibold underline">{st('Повторить')}</button></div>
              : feedback ? <div className="mt-3 space-y-2"><p className="break-words text-sm font-semibold">{feedbackLesson?.name || st('Занятие')}</p>
                {feedback.grade != null && <p className="text-sm text-neutral-600">{st('Оценка')}: <strong>{feedback.grade}/100</strong></p>}
                {feedback.note && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-600">{feedback.note}</p>}
              </div> : <p className="mt-3 text-sm leading-relaxed text-neutral-500">{st('Здесь появятся оценки и комментарии ментора по выбранному курсу.')}</p>}
          </section>}
        </div>
      </div>
      {available && lessons.length > 0 && <details className="rounded-2xl border border-neutral-200 bg-white px-5 py-2">
        <summary className="min-h-11 cursor-pointer py-3 font-semibold">{st('Статусы занятий')}</summary>
        <ol className="divide-y divide-neutral-100 pb-2">{lessons.map(lesson => {
          const entry = journal.data?.find(item => item.activity_id === lesson.id)
          return <li key={lesson.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><Link className="inline-flex min-h-11 items-center break-words text-sm font-semibold hover:underline" href={getUriWithOrg(orgslug, `${coursePath}/activity/${lesson.activity_uuid.replace(/^activity_/, '')}`)}>{lesson.name}</Link>
              {entry?.grade != null && <p className="text-xs text-neutral-500">{st('Оценка')}: {entry.grade}/100</p>}
              {entry?.note && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-neutral-500">{entry.note}</p>}
            </div><div className="shrink-0"><LessonLearningBadge run={selected} activityId={lesson.id} /></div>
          </li>
        })}</ol>
      </details>}
      <section><h2 className="mb-4 text-lg font-bold">{st('Мои курсы')}</h2><div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {runs.map(run => <TrailCourseCard key={run.id} course={run.course} run={run} orgslug={orgslug} selected={selected.id === run.id} onSelect={runs.length > 1 ? () => { setSelectedUuid(run.course.course_uuid); overviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } : undefined} />)}
      </div></section>
    </>}
    {!!applications.data?.length && <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <h2 className="font-bold">{st('Мои заявки')}</h2><div className="mt-3 space-y-4">{applications.data.map(application => <article key={application.course_uuid} className="border-b border-neutral-100 pb-4 last:border-0 last:pb-0">
        <h3 className="break-words text-sm font-semibold">{application.course_name}</h3>
        <p className={`mt-2 text-sm font-medium ${application.status === 'pending' ? 'text-amber-800' : 'text-rose-700'}`}>{st(application.status === 'pending' ? 'Заявка на рассмотрении' : 'Заявка отклонена')}</p>
        <p className="mt-1 text-sm leading-relaxed text-neutral-500">{st(application.status === 'pending' ? 'Повторно отправлять заявку не нужно. После одобрения здесь появится кнопка перехода к занятиям.' : 'Уточните причину у администратора школы. Повторную заявку можно отправить на странице курса.')}</p>
        <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold" href={getUriWithOrg(orgslug, `/course/${application.course_uuid.replace(/^course_/, '')}`)}>{st('Открыть курс')}<ArrowRight size={15} /></Link>
      </article>)}</div>
    </section>}
    <UserCertificates orgslug={orgslug} />
  </div>
}
