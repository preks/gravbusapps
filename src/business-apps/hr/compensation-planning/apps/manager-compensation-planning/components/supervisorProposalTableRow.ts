import type { CompensationBudgetPlanEmployeeRestRow } from '../../../types/compensationBudgetPlanEmployeeRestRow'

/** Row shape for supervisor DataTable: REST row plus resolved employee label for search/sort. */
export type SupervisorProposalTableRow = CompensationBudgetPlanEmployeeRestRow & {
  employeeDisplayName: string
}
