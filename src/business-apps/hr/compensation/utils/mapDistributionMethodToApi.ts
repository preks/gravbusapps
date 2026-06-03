import type { DistributionMethod } from '../types/compensationPlanningTypes'
import {
  BUDGET_DISTRIBUTION_METHOD_OPTIONS,
  DEFAULT_BUDGET_DISTRIBUTION_METHOD,
  type BudgetDistributionMethodApi
} from '../types/budgetPlanGraphqlEnums'

const STORED_DISTRIBUTION_METHODS = new Set<string>(BUDGET_DISTRIBUTION_METHOD_OPTIONS)

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

/**
 * Coerces a stored `compensation_budget_plan_company.distribution_method` string (REST/GraphQL enum) for save payloads.
 */
export function coerceStoredDistributionMethodToApi(raw: string): BudgetDistributionMethodApi {
  if (raw && STORED_DISTRIBUTION_METHODS.has(raw)) {
    return raw as BudgetDistributionMethodApi
  }
  return DEFAULT_BUDGET_DISTRIBUTION_METHOD
}
