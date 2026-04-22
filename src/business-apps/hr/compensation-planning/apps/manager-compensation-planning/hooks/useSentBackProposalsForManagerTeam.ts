import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { fetchCompensationBudgetPlanEmployeesForPlanAndCompany } from '../../../api/fetchCompensationBudgetPlanEmployeesForPlanAndCompany'
import type { CompensationBudgetPlanEmployeeRestRow } from '../../../types/compensationBudgetPlanEmployeeRestRow'

const SENT_BACK = 'BUDGET_PLAN_SENT_BACK'

export function useSentBackProposalsForManagerTeam(params: {
  accessToken: string | undefined
  companyId: string | null
  planId: string | null
  teamMemberEmployeeIds: readonly string[]
}) {
  const { accessToken, companyId, planId, teamMemberEmployeeIds } = params
  const graphqlClient = useGraphQLClient(accessToken ?? '')

  const teamIdSet = useMemo(() => new Set(teamMemberEmployeeIds), [teamMemberEmployeeIds])

  const [rows, setRows] = useState<CompensationBudgetPlanEmployeeRestRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRows = useCallback(async () => {
    if (!accessToken || !companyId || !planId || teamIdSet.size === 0) {
      setRows([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const all = await fetchCompensationBudgetPlanEmployeesForPlanAndCompany(graphqlClient, companyId, planId)
      const filtered = all.filter(r => r.budgetPlanStatus === SENT_BACK && teamIdSet.has(r.employeeId))
      setRows(filtered)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load sent-back proposals'
      setError(message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, companyId, graphqlClient, planId, teamIdSet])

  useEffect(() => {
    void fetchRows()
  }, [fetchRows])

  return {
    sentBackRows: rows,
    sentBackCount: rows.length,
    loading,
    error,
    refetchSentBack: fetchRows
  }
}
