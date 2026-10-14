'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { getUriWithOrg } from '@services/config/config'
import { getUserEnrollments, getBillingPortalSession } from '@services/payments/offers'
import {
  ShoppingBag, RefreshCcw, SquareCheck, ArrowRight,
  ExternalLink, Loader2, CalendarDays, BadgeCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useLHAnalytics, AnalyticsEvent } from '@services/analytics'
import { useTranslation } from 'react-i18next'
import { formatCurrency, formatDate } from '@/lib/format'

interface AccountPurchasesProps {
  orgId: number
  orgslug: string
}

function EnrollmentCard({ enrollment, orgslug, onManageBilling, billingLoading }: {
  enrollment: any
  orgslug: string
  onManageBilling: () => void
  billingLoading: boolean
}) {
  const { t, i18n } = useTranslation()
  const isSubscription = enrollment.offer_type === 'subscription'
  const isActive = enrollment.status === 'active'

  const formattedPrice = enrollment.amount != null
    ? formatCurrency(enrollment.amount, enrollment.currency ?? 'USD', i18n.language)
    : null

  const formattedDate = enrollment.creation_date
    ? formatDate(enrollment.creation_date, i18n.language, { dateStyle: undefined, year: 'numeric', month: 'short', day: 'numeric' })
    : null

  return (
    <div className="bg-white rounded-xl nice-shadow overflow-hidden">
      <div className={`px-4 py-2 flex items-center justify-between ${isSubscription ? 'bg-indigo-50' : 'bg-gray-50'}`}>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isSubscription ? 'text-indigo-700' : 'text-gray-600'}`}>
          {isSubscription ? <RefreshCcw size={11} /> : <SquareCheck size={11} />}
          {isSubscription ? t('purchases.subscription') : t('purchases.one_time')}
        </span>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
          isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          <BadgeCheck size={11} />
          {t(`purchases.status.${enrollment.status}`, { defaultValue: t('purchases.status.other') })}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="font-bold text-gray-900 leading-snug">{enrollment.offer_name}</p>
          {formattedPrice && (
            <div className="shrink-0 text-end">
              <p className={`font-black text-lg ${isSubscription ? 'text-indigo-700' : 'text-gray-900'}`}>
                {formattedPrice}
              </p>
              {isSubscription && (
                <p className="text-xs text-indigo-400 leading-none">{t('purchases.recurring')}</p>
              )}
            </div>
          )}
        </div>
        {formattedDate && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <CalendarDays size={12} />
            <span>{t('purchases.purchased')} {formattedDate}</span>
          </div>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Link
            href={getUriWithOrg(orgslug, `/store/offers/${enrollment.offer_id}`)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors px-3 py-2 min-h-11 rounded-lg"
          >
            {t('purchases.view_offer')} <ArrowRight size={11} />
          </Link>
          {isSubscription && (
            <button
              onClick={onManageBilling}
              disabled={billingLoading}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition-colors px-3 py-2 min-h-11 rounded-lg"
            >
              {billingLoading
                ? <Loader2 size={12} className="animate-spin" />
                : <><ExternalLink size={11} /> {t('purchases.manage_subscription')}</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function AccountPurchases({ orgId, orgslug }: AccountPurchasesProps) {
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const [billingLoading, setBillingLoading] = useState(false)
  const { track } = useLHAnalytics('learner')
  const { t } = useTranslation()

  const { data: enrollmentsResult, isLoading, error } = useQuery({
    queryKey: ['payments', orgId, 'enrollments', 'mine'],
    queryFn: () => getUserEnrollments(orgId, access_token),
    enabled: !!orgId && !!access_token,
    staleTime: 60_000,
  })

  const enrollments: any[] = Array.isArray(enrollmentsResult?.data) ? enrollmentsResult.data : []

  const handleManageBilling = async (source: string) => {
    if (!access_token) return
    setBillingLoading(true)
    try {
      const return_url = `${window.location.origin}${getUriWithOrg(orgslug, '/account/purchases')}`
      const result = await getBillingPortalSession(orgId, return_url, access_token)
      const url = result?.data?.portal_url
      if (url) {
        track(AnalyticsEvent.AccountBillingPortalOpened, { source })
        window.location.href = url
      } else {
        toast.error(t('student_experience.billing_error'))
      }
    } catch (err) {
      toast.error(t('student_experience.billing_error'))
    } finally {
      setBillingLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl nice-shadow p-12 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    )
  }

  if (error || (enrollmentsResult && !enrollmentsResult.success)) {
    return (
      <div className="bg-white rounded-xl nice-shadow p-8 text-center text-sm text-red-400">
        {t('student_experience.purchases_error')}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl nice-shadow p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center nice-shadow">
            <ShoppingBag size={18} className="text-gray-700" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">{t('account.purchases')}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {t('purchases.subtitle')}
            </p>
          </div>
        </div>
      </div>
      {enrollments.length === 0 ? (
        <div className="bg-white rounded-xl nice-shadow p-12 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4 nice-shadow">
            <ShoppingBag size={24} className="text-gray-300" strokeWidth={1.5} />
          </div>
          <h2 className="font-bold text-gray-600 mb-1">{t('purchases.empty_title')}</h2>
          <p className="text-sm text-gray-400 max-w-xs">
            {t('purchases.empty_description')}
          </p>
          <Link
            href={getUriWithOrg(orgslug, '/store')}
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors px-4 py-2 min-h-11 rounded-xl"
          >
            {t('purchases.browse')} <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {enrollments.map((enrollment: any) => (
            <EnrollmentCard
              key={enrollment.enrollment_id}
              enrollment={enrollment}
              orgslug={orgslug}
              onManageBilling={() => handleManageBilling('subscription')}
              billingLoading={billingLoading}
            />
          ))}
          <div className="bg-white rounded-xl nice-shadow p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">{t('purchases.invoices')}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t('purchases.invoices_description')}</p>
            </div>
            <button
              onClick={() => handleManageBilling('invoices')}
              disabled={billingLoading}
              className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-60 transition-colors"
            >
              {billingLoading ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={13} />}
              {t('purchases.open_portal')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountPurchases
