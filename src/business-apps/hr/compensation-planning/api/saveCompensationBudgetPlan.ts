import type { RestClient } from '@/common/network/rest/RestClient'
import type { BudgetDistributionMethodApi, BudgetPlanStatusApi } from '../types/budgetPlanGraphqlEnums'
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
  type CompensationBudgetPlanCompanyRestPayload
} from './createCompensationBudgetPlan'

/** Row fields required to build a company-budget UPDATE payload (mirrors `CompensationBudgetPlanCompanyRow`). */
export interface SaveCompensationBudgetPlanCompanyRowInput {
  id: string
  compensationBudgetPlanId: string
  companyId: string
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  bonusBudgetAmount: number
  bonusBudgetPercent: number
  budgetPlanStatus: string
  currentTotalSalaryCost: number
  currencyRef: string | null
  headcount: number
}

export type CompensationBudgetPlanChangeMode = 'INSERT' | 'UPDATE'

/** Insert/update a **compensation budget plan** (plan-level entity). */
export interface SaveCompensationBudgetPlanRestBody {
  changeMode: CompensationBudgetPlanChangeMode
  compensationBudgetPlan: CompensationBudgetPlanCreatePayload
}

export interface CompensationBudgetPlanOrganizationalUnitRestPayload {
  /** Present when {@link CompensationBudgetPlanChangeMode} is `UPDATE`. */
  id?: string
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  bonusBudgetAmount: number
  bonusBudgetPercent: number
  budgetPlanStatus: BudgetPlanStatusApi
  /** `compensation_budget_plan_company.id` */
  compensationBudgetPlanCompany: string
  /** Organizational unit UUID */
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
  compensationBudgetPlanCompany: CompensationBudgetPlanCompanyRestPayload & {
    id: string
    distributionMethod: BudgetDistributionMethodApi
    headcount: number
  }
}

export type SaveCompensationBudgetPlanCompanyRestBody =
  | SaveCompensationBudgetPlanCompanyInsertBody
  | SaveCompensationBudgetPlanCompanyUpdateBody

export function buildSaveCompensationBudgetPlanCompanyUpdateBody(
  row: SaveCompensationBudgetPlanCompanyRowInput,
  distributionMethod: BudgetDistributionMethodApi
): SaveCompensationBudgetPlanCompanyUpdateBody {
  return {
    changeMode: 'UPDATE',
    compensationBudgetPlanCompany: {
      id: row.id,
      compensationBudgetPlan: row.compensationBudgetPlanId,
      company: row.companyId,
      salaryBudgetAmount: row.salaryBudgetAmount,
      salaryBudgetPercent: row.salaryBudgetPercent,
      bonusBudgetAmount: row.bonusBudgetAmount,
      bonusBudgetPercent: row.bonusBudgetPercent,
      budgetPlanStatus: row.budgetPlanStatus as BudgetPlanStatusApi,
      currentTotalSalaryCost: row.currentTotalSalaryCost,
      currencyRef: row.currencyRef,
      distributionMethod,
      headcount: row.headcount
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
  proposedSalaryIncreaseAmount: number
  proposedSalaryIncreasePercent: number
  proposedNewSalary: number
  justification: string
  budgetPlanStatus: BudgetPlanStatusApi
  submittedAt: string
  reviewNotes: string
  /** `compensation_budget_plan_organizational_unit.id` */
  compensationBudgetPlanOrganizationalUnit: string
  /** Employee UUID */
  employee: string
  /** Submitting manager employee UUID */
  submittedByEmployee: string
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
