import Link from 'next/link'
import { BookOpen, CalendarDays, ChartNoAxesCombined } from 'lucide-react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { getUriWithOrg } from '@services/config/config'

export default function MenuLinks({ orgslug }: { orgslug: string; primaryColor?: string }) {
  const session = useLHSession()
  const links = [{ href: '/courses', label: 'Курсы', icon: BookOpen },
    ...(session?.status === 'authenticated' ? [
      { href: '/calendar', label: 'Календарь', icon: CalendarDays },
      { href: '/trail', label: 'Мой прогресс', icon: ChartNoAxesCombined },
    ] : [])]
  return <nav aria-label="Обучение" className="flex flex-wrap gap-3 sm:gap-6">
    {links.map(item => <Link key={item.href} href={getUriWithOrg(orgslug, item.href)}
      className="inline-flex gap-2 items-center text-sm font-semibold hover:opacity-60"><item.icon size={19} />{item.label}</Link>)}
  </nav>
}
