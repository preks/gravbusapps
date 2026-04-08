import type { BudgetPlanStatusApi } from '../types/budgetPlanGraphqlEnums'

/** Level 4 (employee proposal) allowed transitions per the compensation status flow spec. */
export const LEVEL4_EMPLOYEE_PROPOSAL_TRANSITIONS: Readonly<
  Record<BudgetPlanStatusApi, readonly BudgetPlanStatusApi[]>
> = {
  UNKOWN_BUDGET_STATUS: ['BUDGET_PLAN_DRAFT'],
  BUDGET_PLAN_DRAFT: ['BUDGET_PLAN_DRAFT', 'BUDGET_PLAN_SUBMITTED'],
  BUDGET_PLAN_SUBMITTED: ['BUDGET_PLAN_APPROVED', 'BUDGET_PLAN_SENT_BACK', 'BUDGET_PLAN_REJECTED'],
  BUDGET_PLAN_APPROVED: ['BUDGET_PLAN_EXECUTED'],
  BUDGET_PLAN_REJECTED: ['BUDGET_PLAN_DRAFT'],
  BUDGET_PLAN_SENT_BACK: ['BUDGET_PLAN_DRAFT'],
  BUDGET_PLAN_EXECUTED: []
}

export function canTransitionLevel4(from: string, to: BudgetPlanStatusApi): boolean {
  const allowed = LEVEL4_EMPLOYEE_PROPOSAL_TRANSITIONS[from as BudgetPlanStatusApi]
  if (!allowed) {
    return false
  }
  return (allowed as readonly string[]).includes(to)
}

export function isTerminalExecuted(status: string | null | undefined): boolean {
  return status === 'BUDGET_PLAN_EXECUTED'
}

/** HR levels 1–3 stay APPROVED until parent plan execution cascades. */
export function isHrSetupLocked(status: string | null | undefined): boolean {
  return isTerminalExecuted(status)
}

/**
 * Whether all employee proposals are in a resolved state for cycle execution.
 * APPROVED and REJECTED count as resolved; DRAFT / SUBMITTED / SENT_BACK block execution.
 */
export function areAllEmployeeProposalsResolvedForExecution(
  statuses: ReadonlyArray<string | null | undefined>
): boolean {
  if (statuses.length === 0) {
    return true
  }
  return statuses.every(s => s === 'BUDGET_PLAN_APPROVED' || s === 'BUDGET_PLAN_REJECTED')
}
