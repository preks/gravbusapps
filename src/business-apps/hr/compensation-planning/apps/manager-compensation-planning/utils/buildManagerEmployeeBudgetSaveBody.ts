import type { SaveCompensationBudgetPlanEmployeeRestBody } from '../../../api/saveCompensationBudgetPlan'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { computeNewSalaryFromIncrease } from '../../../utils/budgetCalculations'
import { roundMoney2 } from '../../../utils/budgetAmountPercentSync'

/** Salary increase fields aligned with {@link buildSaveCompensationBudgetPlanEmployeeInsertBody} / submit UPDATE. */
export function computeManagerProposalAmountsFromIncrease(
  member: TeamMemberCompensationData,
  increaseAmount: number
): {
  proposedSalaryIncreaseAmount: number
  proposedSalaryIncreasePercent: number
  proposedNewSalary: number
} {
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
    proposedSalaryIncreaseAmount: amount,
    proposedSalaryIncreasePercent: proposedPercent,
    proposedNewSalary
  }
}

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
  const { proposedSalaryIncreaseAmount, proposedSalaryIncreasePercent, proposedNewSalary } =
    computeManagerProposalAmountsFromIncrease(member, increaseAmount)

  return {
    changeMode: 'INSERT',
    compensationBudgetPlanEmployee: {
      proposedSalaryIncreaseAmount,
      proposedSalaryIncreasePercent,
      proposedNewSalary,
      justification: '',
      budgetPlanStatus: 'BUDGET_PLAN_DRAFT',
      submittedAt: options?.submittedAt ?? '',
      reviewNotes: '',
      compensationBudgetPlanOrganizationalUnit: planOrganizationalUnitRowId,
      employee: member.employeeId,
      submittedByEmployee: submittedByEmployeeId
    }
  }
}
