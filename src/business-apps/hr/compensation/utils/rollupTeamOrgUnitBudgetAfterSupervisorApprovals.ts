import type { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import type { RestClient } from '@/common/network/rest/RestClient'
import type { CompensationBudgetPlanEmployeeRestRow } from '../types/compensationBudgetPlanEmployeeRestRow'
import { reduceOrgUnitBudgetPoolByAmount } from './reduceOrgUnitBudgetPoolByAmount'

/**
 * After supervisor/HR approval of selected proposals: keep OU `salary_budget_amount` as the HR slice, set OU
 * `allocation_amount` to the sum of employee `allocationAmount` on that org-unit budget row, and mark the OU line
 * approved (see `reduceOrgUnitBudgetPoolByAmount`).
 */
export async function rollupTeamOrgUnitBudgetAfterSupervisorApprovals(
  graphqlClient: GraphQLClient,
  restClient: RestClient,
  accessToken: string,
  planOuRowId: string,
  newlyApprovedRows: readonly CompensationBudgetPlanEmployeeRestRow[]
): Promise<void> {
  const rowIds = newlyApprovedRows.map(r => r.id).filter(id => id.trim() !== '')
  if (rowIds.length === 0) {
    return
  }

  await reduceOrgUnitBudgetPoolByAmount(graphqlClient, restClient, accessToken, planOuRowId, {
    orgUnitBudgetPlanStatus: 'BUDGET_PLAN_APPROVED'
  })
}
