import type { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import type { RestClient } from '@/common/network/rest/RestClient'
import { GET_COMPENSATION_BUDGET_PLAN_EMPLOYEE_INCREASE_AMOUNTS_BY_ROW_IDS } from '../queries/budgetPlanQueries'
import type { CompensationBudgetPlanEmployeeRestRow } from '../types/compensationBudgetPlanEmployeeRestRow'
import { roundMoney2 } from './budgetAmountPercentSync'
import { reduceOrgUnitBudgetPoolByAmount } from './reduceOrgUnitBudgetPoolByAmount'

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v
  }
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

/**
 * After supervisor approval, persist a reduced org-unit salary budget so the team pool in the database
 * matches committed increases (same percent basis as HR “Distribute” — % of company salary budget amount).
 * Then re-save the company budget row so any server-side rollups tied to that path stay consistent.
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

  const amountsResult = await graphqlClient.request<{
    CompensationBudgetPlanEmployee: { proposedSalaryIncreaseAmount: unknown }[]
  }>(GET_COMPENSATION_BUDGET_PLAN_EMPLOYEE_INCREASE_AMOUNTS_BY_ROW_IDS, { ids: rowIds })

  const totalApprovedIncrease = roundMoney2(
    (amountsResult.CompensationBudgetPlanEmployee ?? []).reduce(
      (sum, r) => sum + roundMoney2(num(r.proposedSalaryIncreaseAmount)),
      0
    )
  )

  await reduceOrgUnitBudgetPoolByAmount(graphqlClient, restClient, accessToken, planOuRowId, totalApprovedIncrease, {
    orgUnitBudgetPlanStatus: 'BUDGET_PLAN_APPROVED'
  })
}
