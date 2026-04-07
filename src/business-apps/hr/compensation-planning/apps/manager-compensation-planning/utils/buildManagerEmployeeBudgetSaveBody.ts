import type { SaveCompensationBudgetPlanEmployeeRestBody } from '../../../api/saveCompensationBudgetPlan'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { computeNewSalaryFromIncrease } from '../../../utils/budgetCalculations'
import { roundMoney2 } from '../../../utils/budgetAmountPercentSync'

export function resolvePlanOrganizationalUnitRowIdForTeamMember(
  member: TeamMemberCompensationData,
  planOuRowIdByOrganizationalUnitId: ReadonlyMap<string, string>,
  managerOrganizationalUnitId: string | null
): string | null {
  const ouId = member.organizationalUnitId ?? managerOrganizationalUnitId
  if (!ouId) {
    return null
  }
  return planOuRowIdByOrganizationalUnitId.get(ouId) ?? null
}

export interface BuildManagerEmployeeSaveBodyOptions {
  submittedAt?: string
}

/**
 * Builds an INSERT body for {@link saveCompensationBudgetPlanEmployee} from a team member row and preview increase.
 */
export function buildSaveCompensationBudgetPlanEmployeeInsertBody(
  member: TeamMemberCompensationData,
  increaseAmount: number,
  planOrganizationalUnitRowId: string,
  submittedByEmployeeId: string,
  options?: BuildManagerEmployeeSaveBodyOptions
): SaveCompensationBudgetPlanEmployeeRestBody {
  const current = member.currentAnnualSalary ?? 0
  const amount = roundMoney2(increaseAmount)

  let proposedPercent = 0
  let proposedNewSalary = roundMoney2(current + amount)

  if (current > 0) {
    const computed = computeNewSalaryFromIncrease(current, amount, null)
    if (computed.percent != null) {
      proposedPercent = roundMoney2(computed.percent)
    }
    if (computed.newSalary != null) {
      proposedNewSalary = roundMoney2(computed.newSalary)
    }
  } else if (amount > 0) {
    proposedNewSalary = roundMoney2(amount)
  }

  return {
    changeMode: 'INSERT',
    compensationBudgetPlanEmployee: {
      proposedSalaryIncreaseAmount: amount,
      proposedSalaryIncreasePercent: proposedPercent,
      proposedNewSalary,
      justification: '',
      budgetPlanStatus: 'BUDGET_PLAN_SUBMITTED',
      submittedAt: options?.submittedAt ?? new Date().toISOString(),
      reviewNotes: '',
      compensationBudgetPlanOrganizationalUnit: planOrganizationalUnitRowId,
      employee: member.employeeId,
      submittedByEmployee: submittedByEmployeeId
    }
  }
}
