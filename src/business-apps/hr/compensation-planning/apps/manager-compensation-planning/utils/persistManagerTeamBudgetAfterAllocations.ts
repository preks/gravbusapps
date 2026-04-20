import type { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import type { RestClient } from '@/common/network/rest/RestClient'
import {
  buildSaveCompensationBudgetPlanCompanyUpdateBody,
  saveCompensationBudgetPlanCompany,
  saveCompensationBudgetPlanOrganizationalUnit
} from '../../../api/saveCompensationBudgetPlan'
import { GET_COMPENSATION_BUDGET_PLAN_COMPANY_ROW_BY_ID } from '../../../queries/budgetPlanQueries'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { roundMoney2 } from '../../../utils/budgetAmountPercentSync'
import { graphqlUnknownToStringOrNull } from '../../../utils/graphqlUnknownToString'
import type { CompensationBudgetPlanCompanyRow } from '../../compensation-planning/hooks/useBudgetSetupForCompany'
import type { ManagerOrgUnitBudgetSnapshot } from '../hooks/useManagerTeamSalaryBudget'
import { resolvePlanOrganizationalUnitRowIdForTeamMember } from './buildManagerEmployeeBudgetSaveBody'

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v
  }
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

function percentOfPool(amount: number, pool: number): number {
  if (pool <= 0 || !Number.isFinite(amount) || !Number.isFinite(pool)) {
    return 0
  }
  return Math.round((10000 * amount) / pool) / 100
}

function mapCompanyRowToSaveInput(raw: Record<string, unknown>) {
  return {
    id: String(raw.id),
    version: num(raw.version),
    compensationBudgetPlanId: String(raw.compensationBudgetPlanId),
    companyId: String(raw.companyId),
    salaryBudgetAmount: num(raw.salaryBudgetAmount),
    salaryBudgetPercent: num(raw.salaryBudgetPercent),
    currentTotalSalaryCost: num(raw.currentTotalSalaryCost),
    currencyRef: graphqlUnknownToStringOrNull(raw.currencyRef)
  }
}

/**
 * After manager “Distribute” saves employee rows, reduce each affected org-unit plan row’s
 * `salary_budget_amount` via REST using snapshots from the same LIST query as the team pool
 * (avoids a separate GET-by-id for each OU). Then refreshes the company row and saves it,
 * matching {@link reduceOrgUnitBudgetPoolByAmount}.
 */
export async function persistManagerTeamBudgetAfterAllocations(input: {
  graphqlClient: GraphQLClient
  restClient: RestClient
  accessToken: string
  companyBudgetRow: CompensationBudgetPlanCompanyRow
  orgUnitBudgetSnapshotsByPlanRowId: ReadonlyMap<string, ManagerOrgUnitBudgetSnapshot>
  selectedEmployeeIds: readonly string[]
  memberById: ReadonlyMap<string, TeamMemberCompensationData>
  allocationByEmployeeId: ReadonlyMap<string, number>
  planOuRowIdByOrganizationalUnitId: ReadonlyMap<string, string>
  managerOrganizationalUnitId: string | null
}): Promise<void> {
  const {
    graphqlClient,
    restClient,
    accessToken,
    companyBudgetRow,
    orgUnitBudgetSnapshotsByPlanRowId,
    selectedEmployeeIds,
    memberById,
    allocationByEmployeeId,
    planOuRowIdByOrganizationalUnitId,
    managerOrganizationalUnitId
  } = input

  const byPlanOuRowId = new Map<string, number>()

  for (const employeeId of selectedEmployeeIds) {
    const m = memberById.get(employeeId)
    if (!m) {
      continue
    }
    const planOuRowId = resolvePlanOrganizationalUnitRowIdForTeamMember(
      m,
      planOuRowIdByOrganizationalUnitId,
      managerOrganizationalUnitId
    )
    if (!planOuRowId) {
      continue
    }
    const amt = roundMoney2(allocationByEmployeeId.get(employeeId) ?? 0)
    if (amt <= 0) {
      continue
    }
    byPlanOuRowId.set(planOuRowId, roundMoney2((byPlanOuRowId.get(planOuRowId) ?? 0) + amt))
  }

  if (byPlanOuRowId.size === 0) {
    return
  }

  const companyPool = roundMoney2(companyBudgetRow.salaryBudgetAmount)

  for (const [planOuRowId, totalAllocated] of byPlanOuRowId) {
    const snap = orgUnitBudgetSnapshotsByPlanRowId.get(planOuRowId)
    if (!snap) {
      throw new Error('Org unit budget row is not available for this team; refresh the page and try again.')
    }
    if (!Number.isFinite(snap.version)) {
      throw new TypeError('Org unit budget row is missing version; refresh the page and try again.')
    }

    const currentOuAmount = roundMoney2(snap.salaryBudgetAmount)
    const nextOuAmount = Math.max(0, roundMoney2(currentOuAmount - totalAllocated))
    const nextOuPercent = percentOfPool(nextOuAmount, companyPool)

    /** After manager submits proposals from the modal, move org-unit slice from DRAFT → SUBMITTED (UI: “Proposals submitted”). */
    await saveCompensationBudgetPlanOrganizationalUnit(restClient, accessToken, {
      changeMode: 'UPDATE',
      compensationBudgetPlanOrganizationalUnit: {
        id: snap.id,
        version: snap.version,
        salaryBudgetAmount: nextOuAmount,
        salaryBudgetPercent: nextOuPercent,
        bonusBudgetAmount: roundMoney2(snap.bonusBudgetAmount),
        bonusBudgetPercent: snap.bonusBudgetPercent,
        budgetPlanStatus: 'BUDGET_PLAN_SUBMITTED',
        compensationBudgetPlanCompany: snap.compensationBudgetPlanCompanyId,
        organizationalUnit: snap.organizationalUnitId
      }
    })
  }

  const companyResult = await graphqlClient.request<{
    CompensationBudgetPlanCompany: Record<string, unknown>[]
  }>(GET_COMPENSATION_BUDGET_PLAN_COMPANY_ROW_BY_ID, { id: companyBudgetRow.id })

  const companyAfterOu = companyResult.CompensationBudgetPlanCompany?.[0]
  if (!companyAfterOu) {
    throw new Error('Company budget row not found after org unit update')
  }

  const companyBody = buildSaveCompensationBudgetPlanCompanyUpdateBody(mapCompanyRowToSaveInput(companyAfterOu))
  await saveCompensationBudgetPlanCompany(restClient, accessToken, companyBody)
}
