'use client'
import { useSchoolTranslation } from '@lib/school-i18n'

import Link from 'next/link'
import { canApproveCourseApplications } from '@/lib/learning'
import { ArrowUpRight } from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import useAdminStatus from '@components/Hooks/useAdminStatus'
import { SCHOOL_DASH_LINKS } from '@components/Dashboard/Menus/DashLeftMenu'
import { getUriWithOrg } from '@services/config/config'

const descriptions: Record<string, string> = {
  '/dash/courses': 'Создание курсов, план по месяцам и материалы занятий.',
  '/dash/calendar': 'Даты и время занятий всех ваших курсов.',
  '/dash/assignments': 'Домашние задания и проверка работ студентов.',
  '/dash/applications': 'Одобрение заявок и открытие доступа к занятиям.',
  '/dash/users/settings/users': 'Участники школы и назначение ролей.',
}
export default function SchoolDashboardHome() {
  const { t: st } = useSchoolTranslation()
  const org = useOrg() as any
  const session = useLHSession() as any
  const { canManageOrg } = useAdminStatus()
  const canApprove = canApproveCourseApplications(session, org?.id)
  const name = session?.data?.user?.first_name || session?.data?.user?.username
  return <main className="max-w-6xl mx-auto w-full p-4 sm:p-8 space-y-8">
    <header><p className="text-sm text-neutral-500">{st("BestDevs · Учебная платформа")}</p><h1 className="text-3xl font-bold mt-2">{name ? st("{{name}}, привет", { name: name }) : st("Управление обучением")}</h1><p className="text-neutral-500 mt-3">{st("Курсы, расписание и студенты — всё нужное для работы школы.")}</p></header>
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{SCHOOL_DASH_LINKS.filter(item => item.href !== '/dash' && (item.href === '/dash/applications' ? canApprove : !item.admin || canManageOrg)).map(item => <Link key={item.href} href={getUriWithOrg(org?.slug, item.href)} className="rounded-2xl border border-neutral-200 bg-white p-6 hover:border-lime-400 transition-colors">
      <div className="flex justify-between"><item.icon size={24} className="text-lime-700" /><ArrowUpRight size={20} className="text-neutral-400" /></div><h2 className="font-bold text-lg mt-5">{st(item.label)}</h2><p className="text-sm text-neutral-500 mt-2">{st(descriptions[item.href])}</p>
    </Link>)}</div>
    <p className="rounded-2xl bg-lime-50 border border-lime-100 p-5 text-sm text-neutral-700">{st("Для посещаемости и оценок откройте курс и вкладку «Посещаемость и оценки». Прогресс студентов обновляется после отметки ментора.")}</p>
  </main>
}
