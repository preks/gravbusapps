import type { SaveCompensationBudgetPlanEmployeeRestBody } from '../../../api/saveCompensationBudgetPlan'

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

/** Batch-submit: move employee proposal from DRAFT → SUBMITTED (manager flow), using numeric fields from allocation preview. */
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
