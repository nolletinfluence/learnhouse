import { describe, expect, test } from 'bun:test'

import {
  courseExperiencePolicy,
  isManagementIdentity,
} from '../components/Hooks/useManagementIdentity'

const org = { id: 7 }

function session(roleId: number, roleUuid: string) {
  return {
    status: 'authenticated',
    data: {
      user: { is_superadmin: false },
      roles: [{ org, role: { id: roleId, role_uuid: roleUuid } }],
    },
  }
}

describe('management course preview policy', () => {
  test('classifies administrator, maintainer, and superadmin identities', () => {
    expect(isManagementIdentity(session(1, 'role_global_admin'), org.id)).toBe(true)
    expect(isManagementIdentity(session(2, 'role_global_maintainer'), org.id)).toBe(true)
    expect(
      isManagementIdentity(
        { status: 'authenticated', data: { user: { is_superadmin: true }, roles: [] } },
        org.id
      )
    ).toBe(true)
    expect(isManagementIdentity(session(4, 'role_global_user'), org.id)).toBe(false)
  })

  test('uses preview without trail state for management identities', () => {
    expect(courseExperiencePolicy(true)).toEqual({
      mode: 'preview',
      primaryActionLabel: 'Предпросмотр курса',
      trailEnabled: false,
    })
    expect(courseExperiencePolicy(false).trailEnabled).toBe(true)
  })
})
