import type { RestClient } from '@/common/network/rest/RestClient'
import { extractCreatedCompensationBudgetPlanEmployeeId } from '../../../api/createCompensationBudgetPlan'
import { saveCompensationBudgetPlanEmployee } from '../../../api/saveCompensationBudgetPlan'
import type { DistributionMethod, TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import {
  buildSaveCompensationBudgetPlanEmployeeInsertBody,
  resolvePlanOrganizationalUnitRowIdForTeamMember
} from './buildManagerEmployeeBudgetSaveBody'

export function validateCustomPoolForSelected(
  distributionMethod: DistributionMethod,
  distributionPool: number | null,
  selectedIds: readonly string[],
  allocationByEmployeeId: ReadonlyMap<string, number>
): boolean {
  if (distributionMethod !== 'custom' || distributionPool == null) {
    return true
  }
  let sumSelected = 0
  for (const id of selectedIds) {
    sumSelected += allocationByEmployeeId.get(id) ?? 0
  }
  return sumSelected <= distributionPool + 0.01
}

export function validatePlanOuForAllSelected(
  selectedIds: readonly string[],
  memberById: ReadonlyMap<string, TeamMemberCompensationData>,
  planOuRowIdByOrganizationalUnitId: ReadonlyMap<string, string>,
  managerOrganizationalUnitId: string | null
): { ok: true } | { ok: false; displayName: string } {
  for (const id of selectedIds) {
    const m = memberById.get(id)
    if (!m) {
      continue
    }
    const planOuId = resolvePlanOrganizationalUnitRowIdForTeamMember(
      m,
      planOuRowIdByOrganizationalUnitId,
      managerOrganizationalUnitId
    )
    if (!planOuId) {
      return { ok: false, displayName: m.displayName }
    }
  }
  return { ok: true }
}

export interface PersistAllocationsForSelectedEmployeesInput {
  restClient: RestClient
  accessToken: string
  selectedIds: readonly string[]
  memberById: ReadonlyMap<string, TeamMemberCompensationData>
  allocationByEmployeeId: ReadonlyMap<string, number>
  planOuRowIdByOrganizationalUnitId: ReadonlyMap<string, string>
  managerOrganizationalUnitId: string | null
  managerEmployeeId: string
}

export async function persistAllocationsForSelectedEmployees(
  input: PersistAllocationsForSelectedEmployeesInput
): Promise<Record<string, string>> {
  const {
    restClient,
    accessToken,
    selectedIds,
    memberById,
    allocationByEmployeeId,
    planOuRowIdByOrganizationalUnitId,
    managerOrganizationalUnitId,
    managerEmployeeId
  } = input
  const createdIdsByEmployeeId: Record<string, string> = {}
  for (const id of selectedIds) {
    const m = memberById.get(id)
    if (!m) {
      continue
    }
    const planOuId = resolvePlanOrganizationalUnitRowIdForTeamMember(
      m,
      planOuRowIdByOrganizationalUnitId,
      managerOrganizationalUnitId
    )
    if (!planOuId) {
      continue
    }
    const rawAmount = allocationByEmployeeId.get(id) ?? 0
    const body = buildSaveCompensationBudgetPlanEmployeeInsertBody(m, rawAmount, planOuId, managerEmployeeId, {
      submitAsSubmitted: true,
      submittedAt: new Date().toISOString()
    })
    const raw = await saveCompensationBudgetPlanEmployee(restClient, accessToken, body)
    const rowId = extractCreatedCompensationBudgetPlanEmployeeId(raw)
    if (rowId) {
      createdIdsByEmployeeId[m.employeeId] = rowId
    }
  }
  return createdIdsByEmployeeId
}
