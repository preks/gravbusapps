/**
 * REST helpers for compensation budget employee-process routes.
 *
 * - **Budget plan tab** (add plan): `createCompensationBudgetPlan` → `/createCompensationBudgetPlan`
 *   (see `useBudgetPlansTable`).
 * - **Budget setup tab** (add budget setup for a company): `createCompensationBudgetPlanCompany` →
 *   `/createCompensationBudgetPlanCompany` (see `useBudgetSetupForCompany`).
 */
import type { RestClient } from '@/common/network/rest/RestClient'
import type { BudgetDistributionMethodApi, BudgetPlanStatusApi } from '../types/budgetPlanGraphqlEnums'
import {
  CREATE_COMPENSATION_BUDGET_PLAN_COMPANY_PATH,
  CREATE_COMPENSATION_BUDGET_PLAN_PATH
} from './compensationBudgetRestConfig'

export { CREATE_COMPENSATION_BUDGET_PLAN_COMPANY_PATH, CREATE_COMPENSATION_BUDGET_PLAN_PATH }

export interface CompensationBudgetPlanCreatePayload {
  name: string
  description: string
  fiscalYear: number
  startDate: string | null
  endDate: string | null
  effectiveDate: string | null
  budgetPlanStatus: BudgetPlanStatusApi
}

export interface CreateCompensationBudgetPlanRestBody {
  compensationBudgetPlan: CompensationBudgetPlanCreatePayload
}

export function buildCreateCompensationBudgetPlanRestBody(input: {
  name: string
  description: string | null
  fiscalYear: number
  budgetPlanStatus: BudgetPlanStatusApi
  startDate: string | null
  endDate: string | null
  effectiveDate: string | null
}): CreateCompensationBudgetPlanRestBody {
  return {
    compensationBudgetPlan: {
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      fiscalYear: input.fiscalYear,
      startDate: input.startDate,
      endDate: input.endDate,
      effectiveDate: input.effectiveDate,
      budgetPlanStatus: input.budgetPlanStatus
    }
  }
}

export interface CompensationBudgetPlanCompanyRestPayload {
  compensationBudgetPlan: string
  company: string
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  bonusBudgetAmount: number
  bonusBudgetPercent: number
  budgetPlanStatus: BudgetPlanStatusApi
  currentTotalSalaryCost: number
  currencyRef: string | null
  /** Optional — omitted from payloads until the product sends them again. */
  distributionMethod?: BudgetDistributionMethodApi
  headcount?: number
}

export interface CreateCompensationBudgetPlanCompanyRestBody {
  compensationBudgetPlanCompany: CompensationBudgetPlanCompanyRestPayload
}

export function extractCreatedCompensationBudgetPlanId(response: unknown): string | null {
  if (response == null || typeof response !== 'object') {
    return null
  }
  const r = response as Record<string, unknown>
  if (typeof r.id === 'string') {
    return r.id
  }
  const plan = r.compensationBudgetPlan
  if (plan && typeof plan === 'object') {
    const rid = (plan as Record<string, unknown>).id
    if (typeof rid === 'string') {
      return rid
    }
  }
  const data = r.data
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if (typeof d.id === 'string') {
      return d.id
    }
    const nested = d.compensationBudgetPlan
    if (nested && typeof nested === 'object') {
      const nid = (nested as Record<string, unknown>).id
      if (typeof nid === 'string') {
        return nid
      }
    }
  }
  return null
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

/** Creates a **compensation budget plan** (plan-level row). Budget **plan** tab only. */
export async function createCompensationBudgetPlan(
  restClient: RestClient,
  accessToken: string,
  body: CreateCompensationBudgetPlanRestBody
): Promise<{ id: string | null; raw: unknown }> {
  const raw = await restClient.post<unknown>(CREATE_COMPENSATION_BUDGET_PLAN_PATH, body, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  return { id: extractCreatedCompensationBudgetPlanId(raw), raw }
}

/** Creates a **plan–company** budget row. Budget **setup** tab add dialog only. */
export async function createCompensationBudgetPlanCompany(
  restClient: RestClient,
  accessToken: string,
  body: CreateCompensationBudgetPlanCompanyRestBody
): Promise<{ id: string | null; raw: unknown }> {
  const raw = await restClient.post<unknown>(CREATE_COMPENSATION_BUDGET_PLAN_COMPANY_PATH, body, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  return { id: extractCreatedCompensationBudgetPlanCompanyId(raw), raw }
}
