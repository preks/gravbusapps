import type { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import type { RestClient } from '@/common/network/rest/RestClient'
import {
  buildSaveCompensationBudgetPlanCompanyUpdateBody,
  saveCompensationBudgetPlanCompany,
  saveCompensationBudgetPlanOrganizationalUnit
} from '../api/saveCompensationBudgetPlan'
import {
  GET_COMPENSATION_BUDGET_PLAN_COMPANY_ROW_BY_ID,
  GET_COMPENSATION_BUDGET_PLAN_EMPLOYEE_ALLOCATION_AMOUNTS_BY_ORG_UNIT_BUDGET_ID,
  GET_COMPENSATION_BUDGET_PLAN_ORG_UNIT_BUDGET_ROW_BY_ID
} from '../queries/budgetPlanQueries'
import type { BudgetPlanStatusApi } from '../types/budgetPlanGraphqlEnums'
import { percentFromAmount, roundMoney2 } from './budgetAmountPercentSync'
import { graphqlUnknownToString } from './graphqlUnknownToString'
import {
  mapGraphqlCompanyBudgetRowToSaveInputStrict,
  mapGraphqlCompanyBudgetRowToSaveInputWithFallback
} from './mapGraphqlCompanyBudgetRowToSaveInput'

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v
  }
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

function coerceOuStatus(raw: unknown): BudgetPlanStatusApi {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (s === '') {
    return 'BUDGET_PLAN_APPROVED'
  }
  return s as BudgetPlanStatusApi
}

export interface ReduceOrgUnitBudgetPoolOptions {
  /** When set (e.g. supervisor approve-all), persisted on the org-unit row instead of the previous status. */
  orgUnitBudgetPlanStatus?: BudgetPlanStatusApi
}

/**
 * After supervisor/HR actions on employee rows: keeps OU `salary_budget_*` as the HR department slice (unchanged).
 * Sets OU `allocation_amount` to the sum of employee `allocationAmount` on this org-unit budget line.
 * Optionally overrides `budgetPlanStatus` (e.g. `BUDGET_PLAN_APPROVED`). Then touches the company row.
 */
export async function reduceOrgUnitBudgetPoolByAmount(
  graphqlClient: GraphQLClient,
  restClient: RestClient,
  accessToken: string,
  planOuRowId: string,
  options?: ReduceOrgUnitBudgetPoolOptions
): Promise<void> {
  const statusOverride = options?.orgUnitBudgetPlanStatus

  const ouResult = await graphqlClient.request<{
    CompensationBudgetPlanOrganizationalUnit: Record<string, unknown>[]
  }>(GET_COMPENSATION_BUDGET_PLAN_ORG_UNIT_BUDGET_ROW_BY_ID, { id: planOuRowId })

  const ou = ouResult.CompensationBudgetPlanOrganizationalUnit?.[0]
  if (!ou) {
    throw new Error('Org unit budget row not found')
  }

  const companyBudgetRowId = graphqlUnknownToString(ou.compensationBudgetPlanCompanyId)
  if (!companyBudgetRowId) {
    throw new Error('Org unit budget row missing company budget reference')
  }

  const companyResult = await graphqlClient.request<{
    CompensationBudgetPlanCompany: Record<string, unknown>[]
  }>(GET_COMPENSATION_BUDGET_PLAN_COMPANY_ROW_BY_ID, { id: companyBudgetRowId })

  const company = companyResult.CompensationBudgetPlanCompany?.[0]
  if (!company) {
    throw new Error('Company budget row not found')
  }

  const companySavePrior = mapGraphqlCompanyBudgetRowToSaveInputStrict(company)

  const companyBaseline = roundMoney2(num(company.currentTotalSalaryCost))
  const nextOuSalary = roundMoney2(num(ou.salaryBudgetAmount))

  const allocResult = await graphqlClient.request<{
    CompensationBudgetPlanEmployee: { allocationAmount: unknown }[]
  }>(GET_COMPENSATION_BUDGET_PLAN_EMPLOYEE_ALLOCATION_AMOUNTS_BY_ORG_UNIT_BUDGET_ID, {
    orgUnitBudgetId: planOuRowId
  })
  const nextOuAllocation = roundMoney2(
    (allocResult.CompensationBudgetPlanEmployee ?? []).reduce((sum, r) => sum + roundMoney2(num(r.allocationAmount)), 0)
  )

  const nextOuPercent =
    companyBaseline > 0
      ? roundMoney2(percentFromAmount(nextOuSalary, companyBaseline))
      : roundMoney2(num(ou.salaryBudgetPercent))

  const ouVersion = num(ou.version)
  if (!Number.isFinite(ouVersion)) {
    throw new TypeError('Org unit budget row is missing version')
  }

  const unitPayload = {
    id: graphqlUnknownToString(ou.id),
    version: ouVersion,
    salaryBudgetAmount: nextOuSalary,
    salaryBudgetPercent: nextOuPercent,
    allocationAmount: nextOuAllocation,
    bonusBudgetAmount: num(ou.bonusBudgetAmount),
    bonusBudgetPercent: num(ou.bonusBudgetPercent),
    budgetPlanStatus: statusOverride ?? coerceOuStatus(ou.budgetPlanStatus),
    compensationBudgetPlanCompany: companyBudgetRowId,
    organizationalUnit: graphqlUnknownToString(ou.organizationalUnitId)
  }

  await saveCompensationBudgetPlanOrganizationalUnit(restClient, accessToken, {
    changeMode: 'UPDATE',
    compensationBudgetPlanOrganizationalUnit: unitPayload
  })

  const companyAfterOuResult = await graphqlClient.request<{
    CompensationBudgetPlanCompany: Record<string, unknown>[]
  }>(GET_COMPENSATION_BUDGET_PLAN_COMPANY_ROW_BY_ID, { id: companyBudgetRowId })

  const companyAfterOu = companyAfterOuResult.CompensationBudgetPlanCompany?.[0]
  if (!companyAfterOu) {
    throw new Error('Company budget row not found after org unit update')
  }

  const companyBody = buildSaveCompensationBudgetPlanCompanyUpdateBody(
    mapGraphqlCompanyBudgetRowToSaveInputWithFallback(companyAfterOu, companySavePrior)
  )
  await saveCompensationBudgetPlanCompany(restClient, accessToken, companyBody)
}

/**
 * Recomputes OU `allocation_amount` as the sum of employee `allocationAmount` on that org-unit budget row.
 * Leaves `salary_budget_*` and OU `budget_plan_status` unchanged (no supervisor status override).
 * Use after manager revises a sent-back employee row so department roll-up stays correct.
 */
export async function refreshOrgUnitAllocationAmountFromEmployees(
  graphqlClient: GraphQLClient,
  restClient: RestClient,
  accessToken: string,
  planOuRowId: string
): Promise<void> {
  const id = planOuRowId.trim()
  if (id === '') {
    return
  }
  await reduceOrgUnitBudgetPoolByAmount(graphqlClient, restClient, accessToken, id)
}
