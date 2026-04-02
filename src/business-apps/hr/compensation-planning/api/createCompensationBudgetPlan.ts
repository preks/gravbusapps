import type { RestClient } from '@/common/network/rest/RestClient'
import type { BudgetDistributionMethodApi, BudgetPlanStatusApi } from '../types/budgetPlanGraphqlEnums'

/**
 * Relative to `NEXT_PUBLIC_BASE_URL` or `NEXT_PUBLIC_COMPENSATION_BUDGET_API_URL`.
 * Creates a `compensation_budget_plan_company` row (company budget for a plan).
 */
export const CREATE_COMPENSATION_BUDGET_PLAN_PATH = '/createCompensationBudgetPlan'

/** Payload field names match the REST contract (`compensationBudgetPlan` + `company` UUIDs). */
export interface CompensationBudgetPlanCompanyRestPayload {
  compensationBudgetPlan: string
  company: string
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  bonusBudgetAmount: number
  bonusBudgetPercent: number
  budgetPlanStatus: BudgetPlanStatusApi
  currentTotalSalaryCost: number
  distributionMethod: BudgetDistributionMethodApi
  headcount: number
  currencyRef: string | null
}

export interface CreateCompensationBudgetPlanCompanyRestBody {
  compensationBudgetPlanCompany: CompensationBudgetPlanCompanyRestPayload
}

export function extractCreatedCompensationBudgetPlanCompanyId(response: unknown): string | null {
  if (response == null || typeof response !== 'object') {
    return null
  }
  const r = response as Record<string, unknown>
  if (typeof r.id === 'string') {
    return r.id
  }
  const row = r.compensationBudgetPlanCompany
  if (row && typeof row === 'object') {
    const rid = (row as Record<string, unknown>).id
    if (typeof rid === 'string') {
      return rid
    }
  }
  const data = r.data
  if (data && typeof data === 'object') {
    const did = (data as Record<string, unknown>).id
    if (typeof did === 'string') {
      return did
    }
  }
  return null
}

export async function createCompensationBudgetPlanCompany(
  restClient: RestClient,
  accessToken: string,
  body: CreateCompensationBudgetPlanCompanyRestBody
): Promise<{ id: string | null; raw: unknown }> {
  const raw = await restClient.post<unknown>(CREATE_COMPENSATION_BUDGET_PLAN_PATH, body, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  return { id: extractCreatedCompensationBudgetPlanCompanyId(raw), raw }
}
