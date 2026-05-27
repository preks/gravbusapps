import type { SaveCompensationBudgetPlanEmployeeRestBody } from '../api/saveCompensationBudgetPlan'
import type { CompensationBudgetPlanEmployeeRestRow } from '../types/compensationBudgetPlanEmployeeRestRow'

function submittedAtIso(row: CompensationBudgetPlanEmployeeRestRow): string {
  return row.submittedAt?.trim() ?? ''
}

/**
 * HR execution: APPROVED → EXECUTED after salary/bonus processes are applied (or when backend allows direct execution).
 * Reuses numeric fields and org/employee/submitter links from the current row.
 */
export function buildExecuteEmployeeProposalBody(
  row: CompensationBudgetPlanEmployeeRestRow
): SaveCompensationBudgetPlanEmployeeRestBody {
  const submittedBy = row.submittedByEmployeeId?.trim()
  if (!submittedBy) {
    throw new Error('Employee proposal is missing submittedByEmployeeId; cannot execute.')
  }
  return {
    changeMode: 'UPDATE',
    compensationBudgetPlanEmployee: {
      id: row.id,
      version: row.version,
      allocationAmount: row.allocationAmount,
      proposedSalaryIncreaseAmount: row.proposedSalaryIncreaseAmount,
      proposedSalaryIncreasePercent: row.proposedSalaryIncreasePercent,
      proposedNewSalary: row.proposedNewSalary,
      justification: row.justification ?? '',
      budgetPlanStatus: 'BUDGET_PLAN_EXECUTED',
      submittedAt: submittedAtIso(row),
      reviewNotes: row.reviewNotes ?? '',
      compensationBudgetPlanOrganizationalUnit: row.compensationBudgetPlanOrganizationalUnitId,
      employee: row.employeeId,
      submittedByEmployee: submittedBy
    }
  }
}
