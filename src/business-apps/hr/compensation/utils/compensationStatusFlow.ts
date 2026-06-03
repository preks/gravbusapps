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
