import type { BudgetPlanStatusApi } from './budgetPlanGraphqlEnums'

/** Fields needed to build `saveCompensationBudgetPlanEmployee` UPDATE bodies (GraphQL → REST). */
export interface CompensationBudgetPlanEmployeeRestRow {
  id: string
  budgetPlanStatus: BudgetPlanStatusApi | string
  employeeId: string
  proposedSalaryIncreaseAmount: number
  proposedSalaryIncreasePercent: number
  proposedNewSalary: number
  justification: string
  submittedAt: string | null
  reviewNotes: string | null
  compensationBudgetPlanOrganizationalUnitId: string
  submittedByEmployeeId: string | null
}
