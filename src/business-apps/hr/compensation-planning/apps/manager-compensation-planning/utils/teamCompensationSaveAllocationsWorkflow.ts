import type { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import type { RestClient } from '@/common/network/rest/RestClient'
import { extractCreatedCompensationBudgetPlanEmployeeId } from '../../../api/createCompensationBudgetPlan'
import {
  saveCompensationBudgetPlanEmployee,
  saveCompensationBudgetPlanOrganizationalUnit
} from '../../../api/saveCompensationBudgetPlan'
import { GET_COMPENSATION_BUDGET_PLAN_ORG_UNIT_BUDGET_ROW_BY_ID } from '../../../queries/budgetPlanQueries'
import type { BudgetPlanStatusApi } from '../../../types/budgetPlanGraphqlEnums'
import type { DistributionMethod, TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { roundMoney2 } from '../../../utils/budgetAmountPercentSync'
import { graphqlUnknownToString } from '../../../utils/graphqlUnknownToString'
import {
  buildSaveCompensationBudgetPlanEmployeeInsertBody,
  computeManagerProposalAmountsFromIncrease,
  resolvePlanOrganizationalUnitRowIdForTeamMember
} from './buildManagerEmployeeBudgetSaveBody'

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v
  }
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

function coerceOuBudgetStatus(raw: unknown): BudgetPlanStatusApi {
  const s = typeof raw === 'string' ? raw.trim() : ''
  return (s || 'BUDGET_PLAN_DRAFT') as BudgetPlanStatusApi
}

/**
 * After managers submit employee proposals, OU rows should move to `BUDGET_PLAN_SUBMITTED` (submissions UI:
 * "Submitted"). Preserve terminal rows that must not be overwritten.
 */
function budgetPlanStatusAfterManagerEmployeeSubmit(prior: unknown): BudgetPlanStatusApi {
  const current = coerceOuBudgetStatus(prior)
  if (current === 'BUDGET_PLAN_APPROVED' || current === 'BUDGET_PLAN_EXECUTED') {
    return current
  }
  return 'BUDGET_PLAN_SUBMITTED'
}

/**
 * Increments OU `allocation_amount` by the sum of `allocationAmount` values persisted on employee rows in this batch
 * (same figures as {@link buildSaveCompensationBudgetPlanEmployeeInsertBody}).
 */
async function incrementOrgUnitBudgetAllocationAmount(
  graphqlClient: GraphQLClient,
  restClient: RestClient,
  accessToken: string,
  planOrganizationalUnitRowId: string,
  distributedDelta: number
): Promise<void> {
  const delta = roundMoney2(distributedDelta)
  if (delta <= 0) {
    return
  }

  const ouResult = await graphqlClient.request<{
    CompensationBudgetPlanOrganizationalUnit: Record<string, unknown>[]
  }>(GET_COMPENSATION_BUDGET_PLAN_ORG_UNIT_BUDGET_ROW_BY_ID, { id: planOrganizationalUnitRowId })

  const ou = ouResult.CompensationBudgetPlanOrganizationalUnit?.[0]
  if (!ou) {
    throw new Error('Org unit budget row not found')
  }

  const companyBudgetRowId = graphqlUnknownToString(ou.compensationBudgetPlanCompanyId)
  if (!companyBudgetRowId) {
    throw new Error('Org unit budget row missing company budget reference')
  }

  const nextAlloc = roundMoney2(roundMoney2(num(ou.allocationAmount)) + delta)
  const ouVersion = num(ou.version)
  if (!Number.isFinite(ouVersion)) {
    throw new TypeError('Org unit budget row is missing version')
  }

  await saveCompensationBudgetPlanOrganizationalUnit(restClient, accessToken, {
    changeMode: 'UPDATE',
    compensationBudgetPlanOrganizationalUnit: {
      id: graphqlUnknownToString(ou.id),
      version: ouVersion,
      salaryBudgetAmount: roundMoney2(num(ou.salaryBudgetAmount)),
      salaryBudgetPercent: roundMoney2(num(ou.salaryBudgetPercent)),
      allocationAmount: nextAlloc,
      bonusBudgetAmount: num(ou.bonusBudgetAmount),
      bonusBudgetPercent: num(ou.bonusBudgetPercent),
      budgetPlanStatus: budgetPlanStatusAfterManagerEmployeeSubmit(ou.budgetPlanStatus),
      compensationBudgetPlanCompany: companyBudgetRowId,
      organizationalUnit: graphqlUnknownToString(ou.organizationalUnitId)
    }
  })
}

/**
 * When managers submit existing draft employee rows (UPDATE), allocation on the OU row may already be correct —
 * still promote `budget_plan_status` so department submissions show "Submitted".
 */
export async function promoteOrgUnitBudgetRowToSubmittedAfterManagerSubmit(
  graphqlClient: GraphQLClient,
  restClient: RestClient,
  accessToken: string,
  planOrganizationalUnitRowId: string
): Promise<void> {
  const ouResult = await graphqlClient.request<{
    CompensationBudgetPlanOrganizationalUnit: Record<string, unknown>[]
  }>(GET_COMPENSATION_BUDGET_PLAN_ORG_UNIT_BUDGET_ROW_BY_ID, { id: planOrganizationalUnitRowId })

  const ou = ouResult.CompensationBudgetPlanOrganizationalUnit?.[0]
  if (!ou) {
    throw new Error('Org unit budget row not found')
  }

  const companyBudgetRowId = graphqlUnknownToString(ou.compensationBudgetPlanCompanyId)
  if (!companyBudgetRowId) {
    throw new Error('Org unit budget row missing company budget reference')
  }

  const nextStatus = budgetPlanStatusAfterManagerEmployeeSubmit(ou.budgetPlanStatus)
  if (nextStatus === coerceOuBudgetStatus(ou.budgetPlanStatus)) {
    return
  }

  const ouVersion = num(ou.version)
  if (!Number.isFinite(ouVersion)) {
    throw new TypeError('Org unit budget row is missing version')
  }

  await saveCompensationBudgetPlanOrganizationalUnit(restClient, accessToken, {
    changeMode: 'UPDATE',
    compensationBudgetPlanOrganizationalUnit: {
      id: graphqlUnknownToString(ou.id),
      version: ouVersion,
      salaryBudgetAmount: roundMoney2(num(ou.salaryBudgetAmount)),
      salaryBudgetPercent: roundMoney2(num(ou.salaryBudgetPercent)),
      allocationAmount: roundMoney2(num(ou.allocationAmount)),
      bonusBudgetAmount: num(ou.bonusBudgetAmount),
      bonusBudgetPercent: num(ou.bonusBudgetPercent),
      budgetPlanStatus: nextStatus,
      compensationBudgetPlanCompany: companyBudgetRowId,
      organizationalUnit: graphqlUnknownToString(ou.organizationalUnitId)
    }
  })
}

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
  graphqlClient: GraphQLClient
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
    graphqlClient,
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
  const distributedByPlanOuRowId = new Map<string, number>()

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
    const { proposedSalaryIncreaseAmount } = computeManagerProposalAmountsFromIncrease(m, rawAmount)
    const employeeAllocationAmount = roundMoney2(proposedSalaryIncreaseAmount)
    if (employeeAllocationAmount > 0) {
      distributedByPlanOuRowId.set(
        planOuId,
        roundMoney2((distributedByPlanOuRowId.get(planOuId) ?? 0) + employeeAllocationAmount)
      )
    }
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

  for (const [planOuRowId, distributedTotal] of distributedByPlanOuRowId) {
    await incrementOrgUnitBudgetAllocationAmount(graphqlClient, restClient, accessToken, planOuRowId, distributedTotal)
  }

  return createdIdsByEmployeeId
}
