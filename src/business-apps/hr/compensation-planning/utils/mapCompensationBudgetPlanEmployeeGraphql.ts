import { graphqlUnknownToString, graphqlUnknownToStringOrNull } from './graphqlUnknownToString'
import type { CompensationBudgetPlanEmployeeRestRow } from '../types/compensationBudgetPlanEmployeeRestRow'

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v
  }
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

export function mapCompensationBudgetPlanEmployeeGraphql(
  raw: Record<string, unknown>
): CompensationBudgetPlanEmployeeRestRow {
  return {
    id: graphqlUnknownToString(raw.id),
    version: num(raw.version),
    budgetPlanStatus: graphqlUnknownToString(raw.budgetPlanStatus),
    employeeId: graphqlUnknownToString(raw.employeeId),
    proposedSalaryIncreaseAmount: num(raw.proposedSalaryIncreaseAmount),
    proposedSalaryIncreasePercent: num(raw.proposedSalaryIncreasePercent),
    proposedNewSalary: num(raw.proposedNewSalary),
    justification: graphqlUnknownToString(raw.justification),
    submittedAt: graphqlUnknownToStringOrNull(raw.submittedAt),
    reviewNotes: graphqlUnknownToStringOrNull(raw.reviewNotes),
    compensationBudgetPlanOrganizationalUnitId: graphqlUnknownToString(raw.compensationBudgetPlanOrganizationalUnitId),
    submittedByEmployeeId: graphqlUnknownToStringOrNull(raw.submittedByEmployeeId)
  }
}
