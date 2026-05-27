import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { LIST_COMPENSATION_BUDGET_PLAN_EMPLOYEES_BY_ORG_UNIT_IDS } from '../queries/budgetPlanQueries'
import { logBudgetGraphqlFailure } from '../utils/budgetPlanGraphqlDebug'
import { mapCompensationBudgetPlanEmployeeGraphql } from '../utils/mapCompensationBudgetPlanEmployeeGraphql'
import type { CompensationBudgetPlanEmployeeRestRow } from '../types/compensationBudgetPlanEmployeeRestRow'

export function useCompensationBudgetPlanEmployeesByOrgUnitIds(
  accessToken: string | undefined,
  orgUnitBudgetIds: string[]
) {
  const graphqlClient = useGraphQLClient(accessToken)
  const [rows, setRows] = useState<CompensationBudgetPlanEmployeeRestRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!accessToken || orgUnitBudgetIds.length === 0) {
      setRows([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await graphqlClient.request<{
        CompensationBudgetPlanEmployee: Record<string, unknown>[]
      }>(LIST_COMPENSATION_BUDGET_PLAN_EMPLOYEES_BY_ORG_UNIT_IDS, { orgUnitBudgetIds })
      setRows((result.CompensationBudgetPlanEmployee ?? []).map(r => mapCompensationBudgetPlanEmployeeGraphql(r)))
    } catch (err) {
      logBudgetGraphqlFailure('useCompensationBudgetPlanEmployeesByOrgUnitIds', err)
      const message = err instanceof Error ? err.message : 'Failed to load employee proposals'
      setError(message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, graphqlClient, orgUnitBudgetIds])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return { rows, loading, error, refetch: fetchData }
}
