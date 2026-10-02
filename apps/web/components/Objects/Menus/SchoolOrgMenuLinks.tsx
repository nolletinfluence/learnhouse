"use client";

import { useSchoolTranslation } from '@lib/school-i18n'
import Link from 'next/link'
import { BookOpen, CalendarDays, ChartNoAxesCombined } from 'lucide-react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { getUriWithOrg } from '@services/config/config'

export default function MenuLinks({ orgslug }: { orgslug: string; primaryColor?: string }) {
  const { t: st } = useSchoolTranslation()
  const session = useLHSession()
  const links = [{ href: '/courses', label: st("Курсы"), icon: BookOpen },
    ...(session?.status === 'authenticated' ? [
      { href: '/calendar', label: st("Календарь"), icon: CalendarDays },
      { href: '/trail', label: st("Мой прогресс"), icon: ChartNoAxesCombined },
    ] : [])]
  return <nav aria-label={st("Обучение")} className="flex flex-wrap gap-3 sm:gap-6">
    {links.map(item => <Link key={item.href} href={getUriWithOrg(orgslug, item.href)}
      className="inline-flex gap-2 items-center text-sm font-semibold hover:opacity-60"><item.icon size={19} />{st(item.label)}</Link>)}
  </nav>
}
