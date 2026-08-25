import { describe, expect, test } from 'bun:test'

import {
  canCreateOrganization,
  canManageOrganizationMembership,
  canSwitchOrganization,
} from '../services/tenancy/productPolicy'

describe('organization product policy', () => {
  test('locks every organization-management surface in single tenancy', () => {
    expect(canCreateOrganization('single')).toBe(false)
    expect(canSwitchOrganization('single')).toBe(false)
    expect(canManageOrganizationMembership('single')).toBe(false)
  })

  test('retains upstream multi-tenant organization management', () => {
    expect(canCreateOrganization('multi')).toBe(true)
    expect(canSwitchOrganization('multi')).toBe(true)
    expect(canManageOrganizationMembership('multi')).toBe(true)
  })
})
