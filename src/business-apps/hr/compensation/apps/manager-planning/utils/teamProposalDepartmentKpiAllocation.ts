import { sumEmployeeAllocationsForOrgUnitRollup } from '../../../utils/orgUnitAllocationAmountRollup'
import type { CompensationBudgetPlanEmployeeRestRow } from '../../../types/compensationBudgetPlanEmployeeRestRow'

/** Sum of `allocationAmount` for team rows that still reserve the org-unit pool (same rule as DB OU roll-up). */
export function sumAllocationForTeamDepartmentKpi(
  teamProposalRows: readonly CompensationBudgetPlanEmployeeRestRow[]
): number {
  return sumEmployeeAllocationsForOrgUnitRollup(teamProposalRows)
}
