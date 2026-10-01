'use client'
import { useState } from 'react'
import { canApproveCourseApplications } from '@/lib/learning'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import useAdminStatus from '@components/Hooks/useAdminStatus'
import { learningRequest } from '@services/courses/learning'

export default function ApplicationsPage() {
  const org = useOrg() as any
  const session = useLHSession() as any
  const { loading } = useAdminStatus()
  const canManageOrg = canApproveCourseApplications(session, org?.id)
  const [busy, setBusy] = useState<number | null>(null)
  const client = useQueryClient()
  const token = session?.data?.tokens?.access_token
  const { data, error, isLoading } = useQuery({
    queryKey: ['school-applications', org?.id, session?.data?.user?.id],
    queryFn: () => learningRequest(`orgs/${org.id}/applications`, token),
    enabled: !!org?.id && !!token && canManageOrg,
  })
  async function decide(id: number, status: string) {
    setBusy(id)
    try {
      await learningRequest(`applications/${id}`, token, 'PUT', { status })
      await client.invalidateQueries({ queryKey: ['school-applications'] })
      toast.success(status === 'approved' ? 'Студент зачислен. Доступ к курсу открыт.' : 'Заявка отклонена')
    } catch (error) { toast.error((error as Error).message) }
    finally { setBusy(null) }
  }
  if (!loading && !canManageOrg) return <p className="p-8">Заявки доступны только администратору.</p>
  return <main className="p-4 sm:p-8 max-w-5xl mx-auto w-full">
    <h1 className="text-2xl font-bold">Заявки на курсы</h1><p className="text-sm text-neutral-500 mt-2 mb-6">После одобрения студент получает доступ к занятиям. Заявка не является подтверждением оплаты.</p>
    {isLoading || loading ? <p>Загружаем заявки…</p> : error ? <p className="text-red-700">Не удалось загрузить заявки.</p> : !data?.length ? <div className="bg-white rounded-2xl border p-8 text-neutral-500">Новых заявок нет.</div>
      : <div className="space-y-3">{data.map((application: any) => <article key={application.id} className="rounded-2xl border bg-white p-5 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[180px]"><h2 className="font-semibold">{application.student_name}</h2><p className="text-sm text-neutral-500 break-all">{application.email}</p><p className="mt-2 text-sm font-medium">{application.course_name}</p><p className="text-xs text-neutral-400 mt-1">{new Date(application.creation_date).toLocaleString('ru', { timeZone: 'Asia/Bishkek' })}</p></div>
        <button disabled={busy != null} onClick={() => decide(application.id, 'rejected')} className="px-4 py-2.5 rounded-xl border text-sm disabled:opacity-40">Отклонить</button>
        <button disabled={busy != null} onClick={() => decide(application.id, 'approved')} className="px-4 py-2.5 rounded-xl bg-lime-300 text-sm font-semibold disabled:opacity-40">{busy === application.id ? 'Сохраняем…' : 'Одобрить и зачислить'}</button>
      </article>)}</div>}
  </main>
}
