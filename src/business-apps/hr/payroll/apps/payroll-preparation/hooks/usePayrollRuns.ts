import { useEffect, useCallback, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_PAYROLL_RUNS_BY_COMPANY } from '../queries/payrollQueries'
import type { PayrollRun } from '../types/payrollTypes'

interface UsePayrollRunsResult {
  runs: PayrollRun[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function usePayrollRuns(accessToken: string, companyId: string | null): UsePayrollRunsResult {
  const client = useGraphqlClient(accessToken)
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchRuns = useCallback(async () => {
    if (!accessToken || !companyId) {
      setRuns([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await client.request<{ PayrollRun: PayrollRun[] }>(GET_PAYROLL_RUNS_BY_COMPANY, {
        legalEntityId: companyId
      })
      setRuns(result.PayrollRun || [])
    } catch (err) {
      console.warn('[usePayrollRuns] Failed to fetch payroll runs:', err)
      setRuns([])
      setError(err instanceof Error ? err : new Error('Failed to fetch payroll runs'))
    } finally {
      setLoading(false)
    }
  }, [accessToken, client, companyId])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  return { runs, loading, error, refetch: fetchRuns }
}
