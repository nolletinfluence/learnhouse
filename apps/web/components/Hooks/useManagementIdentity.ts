'use client'

import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'

const MANAGEMENT_ROLE_IDS = new Set([1, 2])
const MANAGEMENT_ROLE_UUIDS = new Set([
  'role_global_admin',
  'role_global_maintainer',
])

export function isManagementIdentity(session: any, orgId?: number): boolean {
  if (session?.status !== 'authenticated' || !orgId) return false
  if (session?.data?.user?.is_superadmin === true) return true
  return (session?.data?.roles ?? []).some((membership: any) => {
    if (membership?.org?.id !== orgId) return false
    return (
      MANAGEMENT_ROLE_IDS.has(membership?.role?.id) ||
      MANAGEMENT_ROLE_UUIDS.has(membership?.role?.role_uuid)
    )
  })
}

export function courseExperiencePolicy(isManagement: boolean) {
  return isManagement
    ? {
        mode: 'preview' as const,
        primaryActionLabel: 'Предпросмотр курса',
        trailEnabled: false,
      }
    : {
        mode: 'learner' as const,
        primaryActionLabel: '',
        trailEnabled: true,
      }
}

export function useManagementIdentity() {
  const session = useLHSession() as any
  const org = useOrg() as any
  const isManagement = isManagementIdentity(session, org?.id)
  const loading = session?.status === 'loading' || !org?.id
  return { isManagement, loading }
}
