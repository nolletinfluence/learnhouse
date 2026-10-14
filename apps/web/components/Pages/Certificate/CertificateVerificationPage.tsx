'use client'

import React, { useEffect, useState } from 'react'
import { Shield, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { getCertificateByUuid } from '@services/courses/certifications'
import CertificatePreview from '@components/Dashboard/Pages/Course/EditCourseCertification/CertificatePreview'
import { getUriWithOrg, getAbsoluteUriWithOrg } from '@services/config/config'
import { useOrg } from '@components/Contexts/OrgContext'
import { useTrackView, AnalyticsEvent } from '@services/analytics'
import { formatDateTime } from '@/lib/format'
import { normalizeLocale } from '@/lib/locale'

export default function CertificateVerificationPage({ certificateUuid }: { certificateUuid: string }) {
  const { t, i18n } = useTranslation()
  const org = useOrg() as any
  const [data, setData] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  useTrackView(AnalyticsEvent.CertificateVerificationViewed, { verification_status: status }, status !== 'loading')

  useEffect(() => {
    if (!org?.id) return
    let active = true
    setStatus('loading')
    getCertificateByUuid(certificateUuid, org.id).then(result => {
      if (!active) return
      if (result.success && result.data) {
        setData(result.data)
        setStatus('valid')
      } else {
        setStatus(result.status === 404 ? 'invalid' : 'error')
      }
    }).catch(() => { if (active) setStatus('error') })
    return () => { active = false }
  }, [certificateUuid, org?.id, attempt])

  const homeLink = getUriWithOrg(org?.slug || '', '/')
  if (status !== 'valid' || !data) {
    return <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="rounded-2xl bg-white border p-5 sm:p-8 text-center space-y-4">
        <AlertTriangle size={40} className="mx-auto text-amber-600" />
        <h1 className="text-2xl font-bold">{t(`student_experience.certificate_${status}`)}</h1>
        <p className="text-sm text-gray-600">{t(`student_experience.certificate_${status}_description`)}</p>
        <code className="block text-sm break-all">{certificateUuid}</code>
        {status === 'error' && <button onClick={() => setAttempt(value => value + 1)} className="min-h-11 rounded-xl px-4 py-2 bg-gray-900 text-white">{t('common.retry')}</button>}
        <Link href={homeLink} className="inline-flex min-h-11 items-center gap-2 text-sm underline"><ArrowLeft size={18} />{t('student_experience.go_home')}</Link>
      </div>
    </main>
  }

  const config = data.certification.config || {}
  const user = data.user
  const learnerName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || user?.username || ''
  const awarded = new Date(data.certificate_user.created_at).toLocaleDateString(normalizeLocale(i18n.language), { year: 'numeric', month: 'long', day: 'numeric' })
  const qrCodeLink = getAbsoluteUriWithOrg(org?.slug || '', `/certificates/${data.certificate_user.user_certification_uuid}/verify`)
  const details = [
    [t('certificate.certificate_id'), data.certificate_user.user_certification_uuid],
    [t('student_experience.recipient'), learnerName],
    [t('search.course'), data.course.name],
    [t('certificate.awarded'), formatDateTime(data.certificate_user.created_at, i18n.language)],
    [t('student_experience.instructor'), config.certificate_instructor],
  ].filter(([, value]) => value)

  return <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">
    <header className="rounded-2xl bg-white border p-4 sm:p-6 flex flex-col md:flex-row flex-wrap gap-4 items-start md:items-center justify-between">
      <div className="flex gap-3 min-w-0 items-start"><Shield size={28} className="shrink-0 text-green-700" /><div className="min-w-0"><h1 className="text-xl sm:text-2xl font-bold break-words">{t('certificate.verify_certificate')}</h1><p className="text-sm text-gray-500 mt-1">{t('student_experience.certificate_verified_description')}</p></div></div>
      <div role="status" className="inline-flex flex-wrap min-w-0 items-center gap-2 rounded-xl bg-green-50 border border-green-200 p-3 text-green-700 font-semibold text-sm"><CheckCircle size={20} className="shrink-0" />{t('student_experience.certificate_verified')}</div>
    </header>
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
      <section className="min-w-0 rounded-2xl bg-white border p-3 sm:p-5 space-y-4">
        <h2 className="font-semibold">{t('certificate.certificate')}</h2>
        <CertificatePreview certificationName={config.certification_name} certificationDescription={config.certification_description} certificationType={config.certification_type} certificatePattern={config.certificate_pattern} certificateInstructor={config.certificate_instructor} certificateId={data.certificate_user.user_certification_uuid} awardedDate={awarded} learnerName={learnerName} qrCodeLink={qrCodeLink} />
        <Link href={getUriWithOrg(org?.slug || '', `/course/${data.course.course_uuid.replace(/^course_/, '')}`)} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline"><ArrowLeft size={18} />{t('courses.back_to_course')}</Link>
      </section>
      <section className="min-w-0 rounded-2xl bg-white border p-4 sm:p-6">
        <h2 className="font-semibold mb-4">{t('student_experience.certificate_information')}</h2>
        <dl className="space-y-4">{details.map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-gray-500 mb-1">{label}</dt><dd className="rounded-xl bg-gray-50 px-3 py-3 text-sm break-words [overflow-wrap:anywhere]">{value}</dd></div>)}</dl>
        <p className="mt-6 text-sm text-gray-500">{t('student_experience.certificate_security')}</p>
      </section>
    </div>
    <Link href={homeLink} className="inline-flex min-h-11 gap-2 items-center text-sm underline"><ArrowLeft size={18} />{t('student_experience.go_home')}</Link>
  </main>
}
