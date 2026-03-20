import { useState, useEffect, useCallback } from 'react'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { useEmployeeById } from '@/common/data/employee/hooks/useEmployeeById'
import type { EmployeeByIdData } from '@/common/data/employee/hooks/useEmployeeById'
import { getProcessIdFromEndpoint } from '@/business-apps/hr/core/forms/performance-evaluation-peer-approve/hooks/useNominatedPeersFromProcess'

interface ProcessGetResponse {
  employeePerformanceEvaluation?: {
    employee?: string
  }
}

export interface UseEmployeeFromProcessReturn {
  employeeId: string | null
  employee: EmployeeByIdData | null
  loading: boolean
  error: string | null
}

/**
 * Fetches the employee being evaluated from the process by:
 * 1. Extracting processId from psi_processMetadata.endpoint
 * 2. Calling GET /processes/employee/performanceEvaluation/{processId}
 * 3. Reading employeeId from response.employeePerformanceEvaluation.employee
 * 4. Fetching employee details by employeeId
 * Use this for the form header (same approach as PeerApprove).
 */
export function useEmployeeFromProcess(
  accessToken: string | undefined,
  additionalData: Record<string, unknown> | undefined
): UseEmployeeFromProcessReturn {
  const [employeeIdFromProcess, setEmployeeIdFromProcess] = useState<string | null>(null)
  const [processFetchError, setProcessFetchError] = useState<string | null>(null)
  const [processLoading, setProcessLoading] = useState(true)

  const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
  const restClient = useRestClient(baseUrl)

  const fetchProcessAndSetEmployeeId = useCallback(async () => {
    if (!accessToken) {
      setProcessLoading(false)
      return
    }

    const metadata = additionalData?.psi_processMetadata as Record<string, unknown> | undefined
    const endpoint = metadata?.endpoint as string | undefined
    const processId = getProcessIdFromEndpoint(endpoint)

    if (!processId) {
      setEmployeeIdFromProcess(null)
      setProcessLoading(false)
      setProcessFetchError(null)
      return
    }

    setProcessLoading(true)
    setProcessFetchError(null)

    try {
      const path = `/processes/employee/performanceEvaluation/${processId}`
      const response = await restClient.get<ProcessGetResponse>(path, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
      const employeeId = response?.employeePerformanceEvaluation?.employee ?? null
      setEmployeeIdFromProcess(employeeId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch process'
      setProcessFetchError(message)
      setEmployeeIdFromProcess(null)
    } finally {
      setProcessLoading(false)
    }
  }, [accessToken, additionalData, restClient])

  useEffect(() => {
    fetchProcessAndSetEmployeeId()
  }, [fetchProcessAndSetEmployeeId])

  const { employee: employeeById, loading: employeeLoading } = useEmployeeById({
    accessToken: accessToken ?? '',
    employeeId: employeeIdFromProcess ?? undefined
  })

  const loading = processLoading || (employeeIdFromProcess != null && employeeLoading)
  const error = processFetchError

  return {
    employeeId: employeeIdFromProcess,
    employee: employeeById ?? null,
    loading,
    error
  }
}
