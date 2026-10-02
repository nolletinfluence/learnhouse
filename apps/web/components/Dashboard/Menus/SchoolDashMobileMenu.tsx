'use client'
import { useSchoolTranslation } from '@lib/school-i18n'

import { useLHSession } from '@components/Contexts/LHSessionContext'
import Link from 'next/link'
import { canApproveCourseApplications } from '@/lib/learning'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { SCHOOL_DASH_LINKS } from './DashLeftMenu'
import { useOrg } from '@components/Contexts/OrgContext'
import useAdminStatus from '@components/Hooks/useAdminStatus'
import { getUriWithOrg } from '@services/config/config'

export default function DashMobileMenu() {
  const { t: st } = useSchoolTranslation()
  const [open, setOpen] = useState(false)
  const org = useOrg() as any
  const session = useLHSession() as any
  const { canManageOrg } = useAdminStatus()
  const canApprove = canApproveCourseApplications(session, org?.id)
  if (!org) return null
  return <div className="md:hidden">
    <button aria-label={open ? st("Закрыть меню") : st("Открыть меню")} aria-expanded={open} onClick={() => setOpen(!open)}
      className="fixed bottom-5 end-5 z-[100] p-4 rounded-full bg-neutral-900 text-white shadow-xl">
      {open ? <X size={22} /> : <Menu size={22} />}
    </button>
    {open && <nav aria-label={st("Управление обучением")} className="fixed bottom-24 start-4 end-4 z-[100] rounded-2xl bg-neutral-900 text-white shadow-xl p-3">
      {SCHOOL_DASH_LINKS.filter(item => item.href === '/dash/applications' ? canApprove : !item.admin || canManageOrg).map(item =>
        <Link key={item.href} href={getUriWithOrg(org.slug, item.href)} onClick={() => setOpen(false)}
          className="flex gap-3 items-center p-3 rounded-xl hover:bg-white/10"><item.icon size={19} />{st(item.label)}</Link>)}
    </nav>}
  </div>
}
