/**
 * GraphQL enums for compensation budget APIs (backend contract).
 */

export type BudgetPlanStatusApi =
  | 'UNKOWN_BUDGET_STATUS'
  | 'BUDGET_PLAN_DRAFT'
  | 'BUDGET_PLAN_SUBMITTED'
  | 'BUDGET_PLAN_APPROVED'
  | 'BUDGET_PLAN_REJECTED'
  | 'BUDGET_PLAN_SENT_BACK'
  | 'BUDGET_PLAN_EXECUTED'

/** Values for company budget row form / REST `createCompensationBudgetPlan` (plan company payload). */
export const BUDGET_PLAN_STATUS_OPTIONS = [
  'UNKOWN_BUDGET_STATUS',
  'BUDGET_PLAN_DRAFT',
  'BUDGET_PLAN_SUBMITTED',
  'BUDGET_PLAN_APPROVED',
  'BUDGET_PLAN_REJECTED',
  'BUDGET_PLAN_SENT_BACK',
  'BUDGET_PLAN_EXECUTED'
] as const satisfies readonly BudgetPlanStatusApi[]

export type BudgetDistributionMethodApi =
  | 'UNKOWN_BUDGET_DISTRIBUTION'
  | 'HEADSCOUNT_DISTRIBUTION'
  | 'SALARY_COST_DISTRIBUTION'
  | 'PERFORMANCE_DISTRIBUTION'
  | 'EQUAL_SPLIT_DISTRIBUTION'
  | 'CUSTOM_DISTRIBUTION'

export const DEFAULT_BUDGET_PLAN_STATUS_DRAFT: BudgetPlanStatusApi = 'BUDGET_PLAN_DRAFT'

export const DEFAULT_BUDGET_DISTRIBUTION_METHOD: BudgetDistributionMethodApi = 'HEADSCOUNT_DISTRIBUTION'

/** Values for distribution method selects (REST / GraphQL). */
export const BUDGET_DISTRIBUTION_METHOD_OPTIONS = [
  'UNKOWN_BUDGET_DISTRIBUTION',
  'HEADSCOUNT_DISTRIBUTION',
  'SALARY_COST_DISTRIBUTION',
  'PERFORMANCE_DISTRIBUTION',
  'EQUAL_SPLIT_DISTRIBUTION',
  'CUSTOM_DISTRIBUTION'
] as const satisfies readonly BudgetDistributionMethodApi[]
