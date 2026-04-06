import type { RestClient } from '@/common/network/rest/RestClient'
import type { BudgetDistributionMethodApi, BudgetPlanStatusApi } from '../types/budgetPlanGraphqlEnums'
import {
  SAVE_COMPENSATION_BUDGET_PLAN_COMPANY_PATH,
  SAVE_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_PATH
} from './compensationBudgetRestConfig'
import type { CompensationBudgetPlanCompanyRestPayload } from './createCompensationBudgetPlan'

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

export interface SaveCompensationBudgetPlanCompanyRestBody {
  compensationBudgetPlanCompany: CompensationBudgetPlanCompanyRestPayload & {
    id: string
    distributionMethod: BudgetDistributionMethodApi
    headcount: number
  }
  changeMode: CompensationBudgetPlanChangeMode
}

export function buildSaveCompensationBudgetPlanCompanyUpdateBody(
  row: SaveCompensationBudgetPlanCompanyRowInput,
  distributionMethod: BudgetDistributionMethodApi
): SaveCompensationBudgetPlanCompanyRestBody {
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
): Promise<unknown> {
  return restClient.post<unknown>(SAVE_COMPENSATION_BUDGET_PLAN_COMPANY_PATH, body, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
}
