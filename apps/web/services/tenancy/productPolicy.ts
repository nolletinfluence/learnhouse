import type { TenancyMode } from '@services/config/config'

export function canCreateOrganization(tenancy: TenancyMode): boolean {
  return tenancy === 'multi'
}

export function canSwitchOrganization(tenancy: TenancyMode): boolean {
  return tenancy === 'multi'
}

export function canManageOrganizationMembership(
  tenancy: TenancyMode
): boolean {
  return tenancy === 'multi'
}
