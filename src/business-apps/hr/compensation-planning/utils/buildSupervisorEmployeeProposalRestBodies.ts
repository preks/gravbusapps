import type { SaveCompensationBudgetPlanEmployeeRestBody } from '../api/saveCompensationBudgetPlan'
import type { CompensationBudgetPlanEmployeeRestRow } from '../types/compensationBudgetPlanEmployeeRestRow'

function submittedAtIso(row: CompensationBudgetPlanEmployeeRestRow): string {
  return row.submittedAt?.trim() ?? ''
}

function baseEmployeePayload(
  row: CompensationBudgetPlanEmployeeRestRow,
  supervisorEmployeeId: string
): SaveCompensationBudgetPlanEmployeeRestBody['compensationBudgetPlanEmployee'] {
  const submittedBy = row.submittedByEmployeeId?.trim() || supervisorEmployeeId
  return {
    id: row.id,
    version: row.version,
    allocationAmount: row.allocationAmount,
    proposedSalaryIncreaseAmount: row.proposedSalaryIncreaseAmount,
    proposedSalaryIncreasePercent: row.proposedSalaryIncreasePercent,
    proposedNewSalary: row.proposedNewSalary,
    justification: row.justification ?? '',
    submittedAt: submittedAtIso(row),
    reviewNotes: row.reviewNotes ?? '',
    compensationBudgetPlanOrganizationalUnit: row.compensationBudgetPlanOrganizationalUnitId,
    employee: row.employeeId,
    submittedByEmployee: submittedBy
  }
}

/** Batch-approve: SUBMITTED → APPROVED (supervisor). */
export function buildSupervisorApproveEmployeeProposalBody(
  row: CompensationBudgetPlanEmployeeRestRow,
  supervisorEmployeeId: string
): SaveCompensationBudgetPlanEmployeeRestBody {
  const reviewedAt = new Date().toISOString()
  return {
    changeMode: 'UPDATE',
    compensationBudgetPlanEmployee: {
      ...baseEmployeePayload(row, supervisorEmployeeId),
      budgetPlanStatus: 'BUDGET_PLAN_APPROVED',
      reviewedByEmployee: supervisorEmployeeId,
      reviewedAt
    }
  }
}

/** Send back: SUBMITTED → SENT_BACK with notes (supervisor). */
export function buildSupervisorSendBackEmployeeProposalBody(
  row: CompensationBudgetPlanEmployeeRestRow,
  supervisorEmployeeId: string,
  reviewNotes: string
): SaveCompensationBudgetPlanEmployeeRestBody {
  const reviewedAt = new Date().toISOString()
  return {
    changeMode: 'UPDATE',
    compensationBudgetPlanEmployee: {
      ...baseEmployeePayload(row, supervisorEmployeeId),
      budgetPlanStatus: 'BUDGET_PLAN_SENT_BACK',
      reviewNotes: reviewNotes.trim(),
      reviewedByEmployee: supervisorEmployeeId,
      reviewedAt
    }
  }
}
