import type { SaveCompensationBudgetPlanEmployeeRestBody } from '../../../api/saveCompensationBudgetPlan'
import type { CompensationBudgetPlanEmployeeRestRow } from '../../../types/compensationBudgetPlanEmployeeRestRow'
import { roundMoney2 } from '../../../utils/budgetAmountPercentSync'

export interface SentBackRevisionNumericFields {
  proposedSalaryIncreaseAmount: number
  proposedSalaryIncreasePercent: number
  proposedNewSalary: number
}

/**
 * Manager revises a sent-back row and resubmits: updated amounts + justification, `BUDGET_PLAN_SUBMITTED`.
 * Preserves `reviewNotes` (supervisor feedback). `submittedByEmployee` must remain a valid employee id for the API.
 */
export function buildSentBackEmployeeProposalRevisionBody(
  row: CompensationBudgetPlanEmployeeRestRow,
  fields: SentBackRevisionNumericFields & { justification: string },
  submittedByEmployeeId: string,
  submittedAtIso: string
): SaveCompensationBudgetPlanEmployeeRestBody {
  const justification = fields.justification.trim()
  const reviewNotes = row.reviewNotes?.trim() ?? ''

  return {
    changeMode: 'UPDATE',
    compensationBudgetPlanEmployee: {
      id: row.id,
      version: row.version,
      allocationAmount: roundMoney2(fields.proposedSalaryIncreaseAmount),
      proposedSalaryIncreaseAmount: roundMoney2(fields.proposedSalaryIncreaseAmount),
      proposedSalaryIncreasePercent: roundMoney2(fields.proposedSalaryIncreasePercent),
      proposedNewSalary: roundMoney2(fields.proposedNewSalary),
      justification,
      budgetPlanStatus: 'BUDGET_PLAN_SUBMITTED',
      submittedAt: submittedAtIso,
      reviewNotes,
      compensationBudgetPlanOrganizationalUnit: row.compensationBudgetPlanOrganizationalUnitId,
      employee: row.employeeId,
      submittedByEmployee: submittedByEmployeeId
    }
  }
}
