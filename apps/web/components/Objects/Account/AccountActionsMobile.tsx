'use client'
import React from 'react'
import { useOrg } from '@components/Contexts/OrgContext'
import { useSchoolTranslation } from '@/lib/school-i18n'
import { useManagementIdentity } from '@components/Hooks/useManagementIdentity'
import { paymentsEnabled } from '@/lib/student-experience'
import Link from 'next/link'
import { User, Lock, ShoppingBag, Settings, BookOpen } from 'lucide-react'
import { getUriWithOrg } from '@services/config/config'
import { useTranslation } from 'react-i18next'

interface AccountActionsMobileProps {
  orgslug: string
  currentSubpage: string
}

const NAV_ITEMS = [
  { id: 'learning', icon: BookOpen, labelKey: 'Моё обучение' },
  { id: 'general', icon: Settings, labelKey: 'account.general' },
  { id: 'profile', icon: User, labelKey: 'account.profile' },
  { id: 'security', icon: Lock, labelKey: 'account.security' },
  { id: 'purchases', icon: ShoppingBag, labelKey: 'account.purchases' },
]

export function AccountActionsMobile({ orgslug, currentSubpage }: AccountActionsMobileProps) {
  const { t } = useTranslation()
  const { t: st } = useSchoolTranslation()
  const { isManagement } = useManagementIdentity()
  const org = useOrg()

  return (
    <nav aria-label={t('account.title')} className="fixed bottom-0 start-0 end-0 z-50 lg:hidden">
      <div className="mx-3 mb-4 bg-white/95 backdrop-blur-sm rounded-xl nice-shadow p-2">
        <div className="flex items-center justify-around">
          {NAV_ITEMS.filter(item => (item.id !== 'learning' || !isManagement) && (item.id !== 'purchases' || paymentsEnabled(org))).map((item) => {
            const Icon = item.icon
            const isActive = currentSubpage === item.id
            return (
              <Link
                key={item.id}
                href={getUriWithOrg(orgslug, item.id === 'learning' ? '/account' : `/account/${item.id}`)}
                aria-current={isActive ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 min-h-11 px-2 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                <span className="text-[10px] font-medium truncate max-w-[60px]">
                  {item.id === 'learning' ? st('Обучение') : t(item.labelKey)}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

export default AccountActionsMobile
