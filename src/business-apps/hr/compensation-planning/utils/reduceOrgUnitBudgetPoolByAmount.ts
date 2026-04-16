import type { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import type { RestClient } from '@/common/network/rest/RestClient'
import {
  buildSaveCompensationBudgetPlanCompanyUpdateBody,
  saveCompensationBudgetPlanCompany,
  saveCompensationBudgetPlanOrganizationalUnit
} from '../api/saveCompensationBudgetPlan'
import {
  GET_COMPENSATION_BUDGET_PLAN_COMPANY_ROW_BY_ID,
  GET_COMPENSATION_BUDGET_PLAN_ORG_UNIT_BUDGET_ROW_BY_ID
} from '../queries/budgetPlanQueries'
import type { BudgetPlanStatusApi } from '../types/budgetPlanGraphqlEnums'
import { roundMoney2 } from './budgetAmountPercentSync'
import { graphqlUnknownToString, graphqlUnknownToStringOrNull } from './graphqlUnknownToString'

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

function coerceOuStatus(raw: unknown): BudgetPlanStatusApi {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (s === '') {
    return 'BUDGET_PLAN_APPROVED'
  }
  return s as BudgetPlanStatusApi
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
 * Reduces `compensation_budget_plan_organizational_unit.salary_budget_amount` by the consumed allocation
 * and refreshes `salary_budget_percent` vs the parent company pool; then touches the company row (same as HR Distribute).
 */
export async function reduceOrgUnitBudgetPoolByAmount(
  graphqlClient: GraphQLClient,
  restClient: RestClient,
  accessToken: string,
  planOuRowId: string,
  amountConsumedFromPool: number
): Promise<void> {
  const delta = roundMoney2(amountConsumedFromPool)
  if (delta <= 0) {
    return
  }

  const ouResult = await graphqlClient.request<{
    CompensationBudgetPlanOrganizationalUnit: Record<string, unknown>[]
  }>(GET_COMPENSATION_BUDGET_PLAN_ORG_UNIT_BUDGET_ROW_BY_ID, { id: planOuRowId })

  const ou = ouResult.CompensationBudgetPlanOrganizationalUnit?.[0]
  if (!ou) {
    throw new Error('Org unit budget row not found')
  }

  const companyBudgetRowId = String(ou.compensationBudgetPlanCompanyId ?? '')
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

  const companyPool = num(company.salaryBudgetAmount)
  const currentOuAmount = roundMoney2(num(ou.salaryBudgetAmount))
  const nextOuAmount = Math.max(0, roundMoney2(currentOuAmount - delta))
  const nextOuPercent = percentOfPool(nextOuAmount, companyPool)

  const ouVersion = num(ou.version)
  if (!Number.isFinite(ouVersion)) {
    throw new TypeError('Org unit budget row is missing version')
  }

  const unitPayload = {
    id: String(ou.id),
    version: ouVersion,
    salaryBudgetAmount: nextOuAmount,
    salaryBudgetPercent: nextOuPercent,
    bonusBudgetAmount: num(ou.bonusBudgetAmount),
    bonusBudgetPercent: num(ou.bonusBudgetPercent),
    budgetPlanStatus: coerceOuStatus(ou.budgetPlanStatus),
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

  const companyBody = buildSaveCompensationBudgetPlanCompanyUpdateBody(mapCompanyRowToSaveInput(companyAfterOu))
  await saveCompensationBudgetPlanCompany(restClient, accessToken, companyBody)
}
