/** Shared helpers for budget setup read-only display. */

export type TranslateFn = (id: string, args?: Record<string, string | number>) => string

/** Maps `compensation_budget_plan.budget_plan_status` API values to i18n keys (`budget-plan-status-*`). */
const BUDGET_PLAN_STATUS_I18N_KEY: Record<string, string> = {
  UNKOWN_BUDGET_STATUS: 'budget-plan-status-unknown',
  BUDGET_PLAN_DRAFT: 'budget-plan-status-draft',
  BUDGET_PLAN_SUBMITTED: 'budget-plan-status-submitted',
  BUDGET_PLAN_APPROVED: 'budget-plan-status-approved',
  BUDGET_PLAN_REJECTED: 'budget-plan-status-rejected',
  BUDGET_PLAN_SENT_BACK: 'budget-plan-status-sent-back',
  BUDGET_PLAN_EXECUTED: 'budget-plan-status-executed'
}

/** Maps `compensation_budget_plan_company.distribution_method` API values to short UI labels. */
const BUDGET_DISTRIBUTION_METHOD_I18N_KEY: Record<string, string> = {
  UNKOWN_BUDGET_DISTRIBUTION: 'budget-distribution-method-label-unknown',
  HEADSCOUNT_DISTRIBUTION: 'budget-distribution-method-label-headcount',
  SALARY_COST_DISTRIBUTION: 'budget-distribution-method-label-salary-cost',
  PERFORMANCE_DISTRIBUTION: 'budget-distribution-method-label-performance',
  EQUAL_SPLIT_DISTRIBUTION: 'budget-distribution-method-label-equal-split',
  CUSTOM_DISTRIBUTION: 'budget-distribution-method-label-custom'
}

/**
 * Label for `compensation_budget_plan_organizational_unit.budget_plan_status` on department submissions:
 * HR budget distribution persists `BUDGET_PLAN_DRAFT` for newly allocated OU slices — show as "Allocated", not "Draft".
 * Other statuses use {@link formatBudgetPlanStatusLabelForDisplay}.
 */
export function formatOrgUnitBudgetStatusLabelForDisplay(value: string | null | undefined, t: TranslateFn): string {
  if (value === 'BUDGET_PLAN_DRAFT') {
    return t('budget-plan-status-org-unit-allocated')
  }
  if (value === 'BUDGET_PLAN_SUBMITTED') {
    return t('budget-plan-status-org-unit-proposals-submitted')
  }
  return formatBudgetPlanStatusLabelForDisplay(value, t)
}

/**
 * Human-readable label for budget plan status (e.g. `BUDGET_PLAN_DRAFT` → "Draft").
 * Falls back to {@link formatEnumLabelForDisplay} for unknown status values.
 */
export function formatBudgetPlanStatusLabelForDisplay(value: string | null | undefined, t: TranslateFn): string {
  if (value == null || value === '') {
    return ''
  }
  const id = BUDGET_PLAN_STATUS_I18N_KEY[value]
  if (id) {
    return t(id)
  }
  return formatEnumLabelForDisplay(value)
}

/**
 * Short label for budget distribution method (e.g. `HEADSCOUNT_DISTRIBUTION` → translated “Headcount”).
 */
export function formatBudgetDistributionMethodLabelForDisplay(
  value: string | null | undefined,
  t: TranslateFn
): string {
  if (value == null || value === '') {
    return ''
  }
  const id = BUDGET_DISTRIBUTION_METHOD_I18N_KEY[value]
  if (id) {
    return t(id)
  }
  return formatEnumLabelForDisplay(value)
}

export function formatEnumLabelForDisplay(value: string | null | undefined): string {
  if (value == null || value === '') {
    return ''
  }
  return String(value).replace(/_/g, ' ')
}
