import type { SaveCompensationBudgetPlanEmployeeRestBody } from '../../../api/saveCompensationBudgetPlan'
import type { CompensationEmployeeProposal } from '../../../types/compensationPlanningTypes'

/**
 * Batch-submit: move employee proposal from DRAFT → SUBMITTED (manager flow).
 */
export function buildSubmitEmployeeProposalUpdateBody(
  proposal: CompensationEmployeeProposal,
  rowVersion: number,
  planOrganizationalUnitRowId: string,
  submittedByEmployeeId: string,
  submittedAtIso: string
): SaveCompensationBudgetPlanEmployeeRestBody {
  return {
    changeMode: 'UPDATE',
    compensationBudgetPlanEmployee: {
      id: proposal.id,
      version: rowVersion,
      proposedSalaryIncreaseAmount: proposal.proposedSalaryIncrease ?? 0,
      proposedSalaryIncreasePercent: proposal.proposedSalaryIncreasePercent ?? 0,
      proposedNewSalary: proposal.proposedNewSalary ?? 0,
      justification: proposal.justification ?? '',
      budgetPlanStatus: 'BUDGET_PLAN_SUBMITTED',
      submittedAt: submittedAtIso,
      reviewNotes: proposal.reviewNotes ?? '',
      compensationBudgetPlanOrganizationalUnit: planOrganizationalUnitRowId,
      employee: proposal.employeeId,
      submittedByEmployee: submittedByEmployeeId
    }
  }
}

export interface BuildSubmitEmployeeProposalUpdateBodyFromRowInput {
  employeeId: string
  employeeBudgetRowId: string
  rowVersion: number
  planOrganizationalUnitRowId: string
  submittedByEmployeeId: string
  submittedAtIso: string
  proposedSalaryIncreaseAmount: number
  proposedSalaryIncreasePercent: number
  proposedNewSalary: number
}

/** Same as {@link buildSubmitEmployeeProposalUpdateBody} when only row id + numeric fields are known (post-save). */
export function buildSubmitEmployeeProposalUpdateBodyFromRow(
  input: BuildSubmitEmployeeProposalUpdateBodyFromRowInput
): SaveCompensationBudgetPlanEmployeeRestBody {
  const {
    employeeId,
    employeeBudgetRowId,
    rowVersion,
    planOrganizationalUnitRowId,
    submittedByEmployeeId,
    submittedAtIso,
    proposedSalaryIncreaseAmount,
    proposedSalaryIncreasePercent,
    proposedNewSalary
  } = input

  return {
    changeMode: 'UPDATE',
    compensationBudgetPlanEmployee: {
      id: employeeBudgetRowId,
      version: rowVersion,
      proposedSalaryIncreaseAmount,
      proposedSalaryIncreasePercent,
      proposedNewSalary,
      justification: '',
      budgetPlanStatus: 'BUDGET_PLAN_SUBMITTED',
      submittedAt: submittedAtIso,
      reviewNotes: '',
      compensationBudgetPlanOrganizationalUnit: planOrganizationalUnitRowId,
      employee: employeeId,
      submittedByEmployee: submittedByEmployeeId
    }
  }
}
