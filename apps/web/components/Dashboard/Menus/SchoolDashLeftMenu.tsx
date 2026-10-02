'use client'
import { useSchoolTranslation } from '@lib/school-i18n'

import Link from 'next/link'
import { canApproveCourseApplications } from '@/lib/learning'
import { usePathname } from 'next/navigation'
import { BookOpen, CalendarDays, ClipboardList, Home, LogOut, Users, FileCheck } from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import { signOut } from '@components/Contexts/AuthContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { getUriWithOrg } from '@services/config/config'
import useAdminStatus from '@components/Hooks/useAdminStatus'
import { cn } from '@/lib/utils'

export const SCHOOL_DASH_LINKS = [
  { href: '/dash', label: 'Главная', icon: Home },
  { href: '/dash/courses', label: 'Курсы', icon: BookOpen },
  { href: '/dash/calendar', label: 'Календарь', icon: CalendarDays },
  { href: '/dash/assignments', label: 'Задания', icon: FileCheck },
  { href: '/dash/applications', label: 'Заявки на курсы', icon: ClipboardList, admin: true },
  { href: '/dash/users/settings/users', label: 'Студенты и менторы', icon: Users, admin: true },
]

export default function DashLeftMenu() {
  const { t: st } = useSchoolTranslation()
  const org = useOrg() as any
  const session = useLHSession() as any
  const pathname = usePathname() || ''
  const { canManageOrg } = useAdminStatus()
  const canApprove = canApproveCourseApplications(session, org?.id)
  if (!org || !session) return null
  return <aside className="hidden md:flex w-[230px] shrink-0 h-screen flex-col bg-[#171a17] text-white border-e border-white/10">
    <Link href="/dash" className="flex items-center gap-3 px-5 h-20 border-b border-white/10">
      <img src="/bestdevs-icon.png" alt="" className="w-9 h-9 rounded-lg" />
      <div><strong className="text-sm">BestDevs</strong><p className="text-xs text-white/45 mt-1">{st("Учебная платформа")}</p></div>
    </Link>
    <nav aria-label={st("Управление обучением")} className="p-3 space-y-1 flex-1">
      {SCHOOL_DASH_LINKS.filter(item => item.href === '/dash/applications' ? canApprove : !item.admin || canManageOrg).map(item => {
        const active = item.href === '/dash' ? pathname.endsWith('/dash') : pathname.includes(item.href)
        return <Link key={item.href} href={getUriWithOrg(org.slug, item.href)} aria-current={active ? 'page' : undefined}
          className={cn('flex gap-3 items-center px-3 py-3 rounded-xl text-sm transition-colors', active ? 'bg-lime-300 text-neutral-900 font-semibold' : 'text-white/65 hover:text-white hover:bg-white/5')}>
          <item.icon size={19} /><span>{st(item.label)}</span>
        </Link>
      })}
    </nav>
    <div className="p-4 border-t border-white/10">
      <p className="text-sm truncate">{session.data?.user?.first_name || session.data?.user?.username}</p>
      <p className="text-xs text-white/40 truncate mt-1">{session.data?.user?.email}</p>
      <button onClick={() => signOut({ redirect: true, callbackUrl: getUriWithOrg(org.slug, '/login') })}
        className="flex gap-2 items-center text-sm text-white/60 hover:text-white mt-4"><LogOut size={16} />{st("Выйти")}</button>
    </div>
  </aside>
}
