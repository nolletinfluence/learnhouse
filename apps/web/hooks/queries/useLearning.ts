'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { courseLearningPath, learningRequest } from '@services/courses/learning'

export function useLearningCalendar(enabled = true) {
  const org = useOrg() as any
  const session = useLHSession() as any
  const token = session?.data?.tokens?.access_token
  return useQuery<any[]>({
    queryKey: ['school-calendar', org?.id, session?.data?.user?.id],
    queryFn: () => learningRequest(`orgs/${org.id}/calendar`, token),
    enabled: !!org?.id && !!token && enabled,
    staleTime: 30_000,
  })
}

export function useMyJournal(courseUuid?: string, enabled = true) {
  const session = useLHSession() as any
  const token = session?.data?.tokens?.access_token
  return useQuery<any[]>({
    queryKey: ['school-my-journal', courseUuid, session?.data?.user?.id],
    queryFn: () => learningRequest(`${courseLearningPath(courseUuid!)}/my-journal`, token),
    enabled: !!courseUuid && !!token && enabled,
    staleTime: 30_000,
  })
}

export function useMyApplications() {
  const org = useOrg() as any
  const session = useLHSession() as any
  const token = session?.data?.tokens?.access_token
  return useQuery<any[]>({
    queryKey: ['school-my-applications', org?.id, session?.data?.user?.id],
    queryFn: () => learningRequest(`orgs/${org.id}/my-applications`, token),
    enabled: !!org?.id && !!token,
    staleTime: 30_000,
  })
}

export function useRecordLessonOpen(courseUuid?: string, activityUuid?: string, enabled = true) {
  const org = useOrg() as any
  const session = useLHSession() as any
  const client = useQueryClient()
  const token = session?.data?.tokens?.access_token
  const userId = session?.data?.user?.id
  const orgId = org?.id
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!enabled || !token || !courseUuid || !activityUuid || !orgId) return
    const controller = new AbortController()
    learningRequest(`${courseLearningPath(courseUuid)}/lessons/${activityUuid}/open`, token, 'POST', undefined, controller.signal)
      .then(position => {
        if (controller.signal.aborted) return
        setError(false)
        const key = [...queryKeys.trail.org(orgId), userId]
        client.setQueryData(key, (trail: any) => trail ? { ...trail, runs: trail.runs.map((run: any) =>
          run.course?.course_uuid === courseUuid ? { ...run, data: { ...run.data, bestdevs_learning: position } } : run
        ) } : trail)
        client.invalidateQueries({ queryKey: key })
      })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [enabled, token, courseUuid, activityUuid, orgId, userId, client, attempt])
  return { error: enabled && error, retry: () => setAttempt(value => value + 1) }
}
