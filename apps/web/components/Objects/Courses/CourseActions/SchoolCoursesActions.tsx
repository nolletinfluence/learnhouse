'use client'
import { useSchoolTranslation } from '@lib/school-i18n'

import Link from 'next/link'
import { courseProgress, courseRun, paymentsEnabled } from '@/lib/student-experience'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, LogIn, Clock, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrgMembership } from '@components/Contexts/OrgContext'
import { getUriWithOrg } from '@services/config/config'
import { learningRequest, courseLearningPath } from '@services/courses/learning'
import { getOffersByResource } from '@services/payments/offers'
import { asArray } from '@services/utils/ts/requests'
import { formatCurrency } from '@/lib/format'

export default function CoursesActions({ courseuuid, orgslug, course, trailData }: any) {
  const { t: st, i18n } = useSchoolTranslation()
  const session = useLHSession() as any
  const { isUserPartOfTheOrg, org } = useOrgMembership()
  const client = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const access = course.learning_access
  const enrolled = access === 'enrolled'
  const pending = access === 'pending' || submitted
  const token = session?.data?.tokens?.access_token
  const settings = course.extra_metadata?.bestdevs_learning
  const { data: offers } = useQuery({
    queryKey: ['school-price', org?.id, course.course_uuid],
    queryFn: () => getOffersByResource(org.id, course.course_uuid),
    enabled: !!org?.id && !enrolled && paymentsEnabled(org) && settings?.price == null,
    staleTime: 60_000,
  })
  const offer = asArray(offers)[0] as any
  const price = settings?.price != null
    ? new Intl.NumberFormat(i18n.language, { style: 'currency', currency: settings.currency || 'KGS', maximumFractionDigits: 2 }).format(Number(settings.price))
    : offer?.amount != null ? formatCurrency(offer.amount, offer.currency || 'KGS', 'ru') : st("Стоимость уточняется")
  const lessons = course.chapters?.flatMap((chapter: any) => chapter.activities || []).filter((lesson: any) => lesson.published !== false) || []
  const run = courseRun(course, trailData)
  const attended = new Set((run?.steps || []).filter((step: any) => step.complete && step.teacher_verified).map((step: any) => step.activity_id))
  const { completed: complete, total, percentage } = courseProgress(course, trailData)
  const nextLesson = lessons.find((lesson: any) => !lesson.is_locked && !attended.has(lesson.id)) || lessons.find((lesson: any) => !lesson.is_locked)
  const destination = percentage === 100 ? 'end' : nextLesson?.activity_uuid.replace(/^activity_/, '')

  async function apply() {
    setBusy(true)
    try {
      await learningRequest(`${courseLearningPath(courseuuid)}/applications`, token, 'POST')
      setSubmitted(true)
      await client.invalidateQueries({ queryKey: ['course'] })
      toast.success(st("Заявка отправлена администратору"))
    } catch (error) { toast.error((error as Error).message) }
    finally { setBusy(false) }
  }

  return <section className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
    {enrolled ? <>
      <p className="font-semibold text-green-700">{st("Вы зачислены на курс")}</p>
      <p className="text-sm text-neutral-500">{st("Посещено")} {complete}  {st("из")} {total}  {st("занятий. Прогресс обновляется после отметки ментора.")}</p>
      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden"><div className="h-full bg-lime-500" style={{ width: `${percentage}%` }} /></div>
      {destination && <Link href={getUriWithOrg(orgslug, `/course/${courseuuid.replace(/^course_/, '')}/activity/${destination}`)}
        className="flex items-center justify-center gap-2 whitespace-nowrap bg-neutral-900 text-white rounded-xl p-3 font-semibold">{percentage === 100 ? st("Итоги курса") : st("К занятиям")}<ArrowRight size={17} /></Link>}
    </> : <>
      <div className="flex items-center gap-2 text-neutral-500 text-sm"><Lock size={17} />{st("Доступ после одобрения заявки")}</div>
      <p className="text-2xl font-bold">{price}</p>
      {settings?.duration_months && <p className="text-sm text-neutral-500">{settings.duration_months}  {st("мес. ·")} {settings.lessons_per_month}  {st("занятий в месяц")}</p>}
      {session.status !== 'authenticated' ? <>
        <p className="text-sm text-neutral-600">{st("Войдите, чтобы подать заявку на курс.")}</p>
        <Link href={getUriWithOrg(orgslug, '/login') + `?next=${encodeURIComponent(getUriWithOrg(orgslug, `/course/${courseuuid.replace(/^course_/, '')}`))}`} className="flex justify-center items-center gap-2 p-3 rounded-xl bg-neutral-900 text-white font-semibold"><LogIn size={18} />{st("Войти")}</Link>
      </> : !isUserPartOfTheOrg ? <Link href={getUriWithOrg(orgslug, '/signup')} className="block p-3 rounded-xl bg-neutral-900 text-white text-center">{st("Зарегистрироваться в школе")}</Link>
      : pending ? <div className="rounded-xl bg-amber-50 p-4 text-amber-900 text-sm"><Clock size={18} className="mb-2" /><strong>{st("Заявка на рассмотрении")}</strong><p className="mt-1">{st("Администратор проверит заявку. После одобрения здесь появятся занятия.")}</p></div>
      : <>
        {access === 'rejected' && <p className="text-sm text-amber-800">{st("Заявка отклонена. Свяжитесь с администратором или отправьте новую.")}</p>}
        <button disabled={busy} onClick={apply} className="w-full rounded-xl bg-lime-300 text-neutral-900 font-semibold p-3 hover:bg-lime-400 disabled:opacity-50">{busy ? st("Отправляем…") : st("Подать заявку на курс")}</button>
        <p className="text-xs text-neutral-500">{st("Отправка заявки не подтверждает оплату или зачисление.")}</p>
      </>}
    </>}
  </section>
}
