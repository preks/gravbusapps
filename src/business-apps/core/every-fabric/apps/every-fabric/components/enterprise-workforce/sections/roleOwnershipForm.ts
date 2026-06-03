// Shared role / department / owner_user_id form helpers for workforce identity UIs.

import type { WorkforceAgent, WorkforceAgentUpdateInput } from '../workforceTypes'

export interface RoleOwnershipValues {
  role: string
  department: string
  ownerUserId: string
}

export function roleOwnershipFromAgent(agent: WorkforceAgent): RoleOwnershipValues {
  return {
    role: agent.workforce_profile.role,
    department: agent.workforce_profile.department ?? '',
    ownerUserId: agent.workforce_profile.owner_user_id ?? ''
  }
}

export function roleOwnershipDirty(a: RoleOwnershipValues, b: RoleOwnershipValues): boolean {
  return a.role !== b.role || a.department !== b.department || a.ownerUserId !== b.ownerUserId
}

export function roleOwnershipToPatch(
  values: RoleOwnershipValues
): Pick<WorkforceAgentUpdateInput, 'role' | 'department' | 'owner_user_id'> {
  return {
    role: values.role.trim(),
    department: values.department.trim() || null,
    owner_user_id: values.ownerUserId.trim() || null
  }
}
