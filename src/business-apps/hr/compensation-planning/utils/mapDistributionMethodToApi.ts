import type { DistributionMethod } from '../types/compensationPlanningTypes'
import type { BudgetDistributionMethodApi } from '../types/budgetPlanGraphqlEnums'

/**
 * Maps UI distribution method to REST/GraphQL enum values on `compensation_budget_plan_company`.
 */
export function mapDistributionMethodToApi(method: DistributionMethod): BudgetDistributionMethodApi {
  switch (method) {
    case 'proportional_headcount':
      return 'HEADSCOUNT_DISTRIBUTION'
    case 'proportional_salary_cost':
      return 'SALARY_COST_DISTRIBUTION'
    case 'performance_weighted':
      return 'PERFORMANCE_DISTRIBUTION'
    case 'equal':
      return 'EQUAL_SPLIT_DISTRIBUTION'
    case 'custom':
    default:
      return 'CUSTOM_DISTRIBUTION'
  }
}
