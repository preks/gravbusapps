import type { SaveCompensationBudgetPlanRestBody } from '../api/saveCompensationBudgetPlan'

export interface CompensationBudgetPlanRowSnapshot {
  id: string
  version: number
  name: string
  description: string | null
  fiscalYear: number
  startDate: string | null
  endDate: string | null
  effectiveDate: string | null
}

export function buildCompensationBudgetPlanUpdateExecutedBody(
  plan: CompensationBudgetPlanRowSnapshot
): SaveCompensationBudgetPlanRestBody {
  return {
    changeMode: 'UPDATE',
    compensationBudgetPlan: {
      id: plan.id,
      version: plan.version,
      name: plan.name.trim(),
      description: plan.description?.trim() ?? '',
      fiscalYear: plan.fiscalYear,
      startDate: plan.startDate,
      endDate: plan.endDate,
      effectiveDate: plan.effectiveDate,
      budgetPlanStatus: 'BUDGET_PLAN_EXECUTED'
    }
  }
}
