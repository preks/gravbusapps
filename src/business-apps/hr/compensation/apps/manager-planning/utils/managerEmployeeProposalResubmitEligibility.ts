import type { CompensationBudgetPlanEmployeeRestRow } from '../../../types/compensationBudgetPlanEmployeeRestRow'
import type { BudgetPlanStatusApi } from '../../../types/budgetPlanGraphqlEnums'

/**
 * Employee rows in these states are in the org / HR review pipeline: the manager must not run
 * “Submit proposals” for them again from team compensation.
 *
 * `BUDGET_PLAN_SENT_BACK` and `BUDGET_PLAN_DRAFT` are excluded so the manager can revise and (re)submit.
 */
const MANAGER_RESUBMIT_FORBIDDEN: ReadonlySet<BudgetPlanStatusApi> = new Set([
  'BUDGET_PLAN_SUBMITTED',
  'BUDGET_PLAN_APPROVED',
  'BUDGET_PLAN_EXECUTED'
])

export function isManagerResubmitBlockedForEmployeeProposalStatus(status: string | null | undefined): boolean {
  const s = (typeof status === 'string' && status.trim() ? status.trim() : 'BUDGET_PLAN_DRAFT') as BudgetPlanStatusApi
  return MANAGER_RESUBMIT_FORBIDDEN.has(s)
}

/**
 * If any persisted row for the employee is in a state that blocks another manager submit, the employee
 * is blocked (several OUs would surface multiple rows).
 */
export function getEmployeeIdsBlockedFromManagerResubmit(
  teamProposalRows: readonly CompensationBudgetPlanEmployeeRestRow[]
): ReadonlySet<string> {
  const blocked = new Set<string>()
  for (const r of teamProposalRows) {
    if (isManagerResubmitBlockedForEmployeeProposalStatus(r.budgetPlanStatus)) {
      blocked.add(r.employeeId)
    }
  }
  return blocked
}
