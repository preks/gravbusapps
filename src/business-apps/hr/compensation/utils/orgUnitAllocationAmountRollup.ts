import { roundMoney2 } from './budgetAmountPercentSync'
import type { BudgetPlanStatusApi } from '../types/budgetPlanGraphqlEnums'

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v
  }
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

/**
 * Proposals in these states reserve the department org-unit `allocation_amount` roll-up.
 * Sent-back and draft rows do not count; after send-back, `allocationAmount` on the row is cleared.
 */
const STATUSES_COUNTING_TOWARD_ORG_UNIT_ALLOCATION: ReadonlySet<BudgetPlanStatusApi> = new Set([
  'BUDGET_PLAN_SUBMITTED',
  'BUDGET_PLAN_APPROVED',
  'BUDGET_PLAN_EXECUTED'
])

export function employeeAllocationContributesToOrgUnitRollup(status: string | null | undefined): boolean {
  const s = (typeof status === 'string' && status.trim() ? status.trim() : 'BUDGET_PLAN_DRAFT') as BudgetPlanStatusApi
  return STATUSES_COUNTING_TOWARD_ORG_UNIT_ALLOCATION.has(s)
}

/** Sums employee `allocationAmount` for rows that still count toward the OU roll-up (matches manager KPI logic). */
export function sumEmployeeAllocationsForOrgUnitRollup(
  employees: ReadonlyArray<{ allocationAmount: unknown; budgetPlanStatus?: unknown }>
): number {
  let sum = 0
  for (const r of employees) {
    const st = typeof r.budgetPlanStatus === 'string' ? r.budgetPlanStatus : undefined
    if (employeeAllocationContributesToOrgUnitRollup(st)) {
      sum += roundMoney2(num(r.allocationAmount))
    }
  }
  return roundMoney2(sum)
}
