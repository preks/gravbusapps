import type { RestClient } from '@/common/network/rest/RestClient'
import type { BudgetPlanStatusApi } from '../types/budgetPlanGraphqlEnums'
import {
  SAVE_COMPENSATION_BUDGET_PLAN_PATH,
  SAVE_COMPENSATION_BUDGET_PLAN_COMPANY_PATH,
  SAVE_COMPENSATION_BUDGET_PLAN_EMPLOYEE_PATH,
  SAVE_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_PATH
} from './compensationBudgetRestConfig'
import {
  extractCreatedCompensationBudgetPlanId,
  extractCreatedCompensationBudgetPlanCompanyId,
  type CompensationBudgetPlanCreatePayload,
  type CompensationBudgetPlanCompanyRestPayload,
  type CompensationBudgetPlanCompanyUpdatePayload,
  type CompensationBudgetPlanUpdatePayload
} from './createCompensationBudgetPlan'

/** Values needed to build `saveCompensationBudgetPlanCompany` UPDATE (includes `version`). */
export interface SaveCompensationBudgetPlanCompanyRowInput {
  id: string
  version: number
  compensationBudgetPlanId: string
  companyId: string
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  allocationAmount: number
  currentTotalSalaryCost: number
  currencyRef: string | null
}

export type CompensationBudgetPlanChangeMode = 'INSERT' | 'UPDATE'

export interface SaveCompensationBudgetPlanRestBody {
  changeMode: CompensationBudgetPlanChangeMode
  compensationBudgetPlan: CompensationBudgetPlanCreatePayload | CompensationBudgetPlanUpdatePayload
}

export interface CompensationBudgetPlanOrganizationalUnitRestPayload {
  id?: string
  /** Required on UPDATE (`changeMode: 'UPDATE'`) — process validation rejects null/missing version. */
  version?: number
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  allocationAmount: number
  bonusBudgetAmount: number
  bonusBudgetPercent: number
  budgetPlanStatus: BudgetPlanStatusApi
  compensationBudgetPlanCompany: string
  organizationalUnit: string
}

export interface SaveCompensationBudgetPlanOrganizationalUnitRestBody {
  compensationBudgetPlanOrganizationalUnit: CompensationBudgetPlanOrganizationalUnitRestPayload
  changeMode: CompensationBudgetPlanChangeMode
}

export interface SaveCompensationBudgetPlanCompanyInsertBody {
  changeMode: 'INSERT'
  compensationBudgetPlanCompany: CompensationBudgetPlanCompanyRestPayload
}

export interface SaveCompensationBudgetPlanCompanyUpdateBody {
  changeMode: 'UPDATE'
  compensationBudgetPlanCompany: CompensationBudgetPlanCompanyUpdatePayload
}

export type SaveCompensationBudgetPlanCompanyRestBody =
  | SaveCompensationBudgetPlanCompanyInsertBody
  | SaveCompensationBudgetPlanCompanyUpdateBody

export function buildSaveCompensationBudgetPlanCompanyUpdateBody(
  row: SaveCompensationBudgetPlanCompanyRowInput
): SaveCompensationBudgetPlanCompanyUpdateBody {
  return {
    changeMode: 'UPDATE',
    compensationBudgetPlanCompany: {
      id: row.id,
      version: row.version,
      salaryBudgetAmount: row.salaryBudgetAmount,
      salaryBudgetPercent: row.salaryBudgetPercent,
      allocationAmount: row.allocationAmount,
      currencyRef: row.currencyRef,
      currentTotalSalaryCost: row.currentTotalSalaryCost,
      compensationBudgetPlan: row.compensationBudgetPlanId,
      company: row.companyId
    }
  }
}

export async function saveCompensationBudgetPlan(
  restClient: RestClient,
  accessToken: string,
  body: SaveCompensationBudgetPlanRestBody
): Promise<{ id: string | null; raw: unknown }> {
  const raw = await restClient.post<unknown>(SAVE_COMPENSATION_BUDGET_PLAN_PATH, body, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  return { id: extractCreatedCompensationBudgetPlanId(raw), raw }
}

export async function saveCompensationBudgetPlanOrganizationalUnit(
  restClient: RestClient,
  accessToken: string,
  body: SaveCompensationBudgetPlanOrganizationalUnitRestBody
): Promise<unknown> {
  return restClient.post<unknown>(SAVE_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_PATH, body, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
}

export async function saveCompensationBudgetPlanCompany(
  restClient: RestClient,
  accessToken: string,
  body: SaveCompensationBudgetPlanCompanyRestBody
): Promise<{ id: string | null; raw: unknown }> {
  const raw = await restClient.post<unknown>(SAVE_COMPENSATION_BUDGET_PLAN_COMPANY_PATH, body, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  return { id: extractCreatedCompensationBudgetPlanCompanyId(raw), raw }
}

export interface CompensationBudgetPlanEmployeeRestPayload {
  /** Set for UPDATE (changeMode UPDATE). */
  id?: string
  /** Required for UPDATE — optimistic locking (from GraphQL `version`). */
  version?: number
  allocationAmount: number
  proposedSalaryIncreaseAmount: number
  proposedSalaryIncreasePercent: number
  proposedNewSalary: number
  justification: string
  budgetPlanStatus: BudgetPlanStatusApi
  /** Empty string when proposal is still in draft (not yet submitted). */
  submittedAt: string
  reviewNotes: string
  compensationBudgetPlanOrganizationalUnit: string
  employee: string
  submittedByEmployee: string
  /** Supervisor review (optional; set when approving or sending back). */
  reviewedByEmployee?: string
  /** ISO-8601 timestamp when supervisor reviewed (optional). */
  reviewedAt?: string
}

export interface SaveCompensationBudgetPlanEmployeeRestBody {
  compensationBudgetPlanEmployee: CompensationBudgetPlanEmployeeRestPayload
  changeMode: CompensationBudgetPlanChangeMode
}

export async function saveCompensationBudgetPlanEmployee(
  restClient: RestClient,
  accessToken: string,
  body: SaveCompensationBudgetPlanEmployeeRestBody
): Promise<unknown> {
  return restClient.post<unknown>(SAVE_COMPENSATION_BUDGET_PLAN_EMPLOYEE_PATH, body, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
}
